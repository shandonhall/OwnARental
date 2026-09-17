-- Phase 2A: first-party Lead CRM + campaign attribution foundation.
-- Additive only. Does not invent historical leads or alter Client/Contract GHL fields.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadSource') THEN
    CREATE TYPE "LeadSource" AS ENUM (
      'META_LEAD_FORM',
      'WEBSITE',
      'MANUAL',
      'PHONE_IN',
      'FACEBOOK_MESSENGER',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadCreativeType') THEN
    CREATE TYPE "LeadCreativeType" AS ENUM ('VIDEO', 'GRAPHIC', 'UNKNOWN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStage') THEN
    CREATE TYPE "LeadStage" AS ENUM (
      'NEW',
      'CONTACTED',
      'QUALIFYING',
      'DOCUMENTS_REQUESTED',
      'APPLICATION_SUBMITTED',
      'APPROVED',
      'VEHICLE_SELECTED',
      'CLOSED_WON',
      'CLOSED_LOST'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadQualificationStatus') THEN
    CREATE TYPE "LeadQualificationStatus" AS ENUM (
      'UNASSESSED',
      'QUALIFIED',
      'UNQUALIFIED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadDisqualificationReason') THEN
    CREATE TYPE "LeadDisqualificationReason" AS ENUM (
      'UBER_BOLT',
      'AFFORDABILITY',
      'INVALID_OR_NO_DRIVERS_LICENCE',
      'UNREACHABLE',
      'NOT_INTERESTED',
      'OUTSIDE_REQUIREMENTS',
      'NO_SUITABLE_VEHICLE',
      'DUPLICATE',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadLossReason') THEN
    CREATE TYPE "LeadLossReason" AS ENUM (
      'APPLICATION_DECLINED',
      'CUSTOMER_WITHDREW',
      'NO_SUITABLE_VEHICLE',
      'UNREACHABLE',
      'DUPLICATE',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadContactChannel') THEN
    CREATE TYPE "LeadContactChannel" AS ENUM (
      'PHONE',
      'WHATSAPP',
      'EMAIL',
      'SMS',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadDeliverySystem') THEN
    CREATE TYPE "LeadDeliverySystem" AS ENUM ('NONE', 'VMG', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationKind' AND e.enumlabel = 'LEAD_ASSIGNED'
  ) THEN
    ALTER TYPE "NotificationKind" ADD VALUE 'LEAD_ASSIGNED';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cellphone TEXT NOT NULL,
  email TEXT,
  area TEXT,
  salary_band TEXT,
  rental_type TEXT,
  vehicle_needed_timing TEXT,
  vehicle_preference TEXT,
  has_valid_drivers_licence BOOLEAN,
  requested_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  source "LeadSource" NOT NULL,
  source_detail TEXT,
  platform TEXT,
  source_created_at TIMESTAMPTZ,
  campaign_id TEXT,
  campaign_name TEXT,
  ad_set_id TEXT,
  ad_set_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  form_id TEXT,
  form_name TEXT,
  creative_type "LeadCreativeType" NOT NULL DEFAULT 'UNKNOWN',
  creative_label TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  external_lead_id TEXT,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  first_attempt_at TIMESTAMPTZ,
  first_attempt_channel "LeadContactChannel",
  first_contact_at TIMESTAMPTZ,
  first_contact_channel "LeadContactChannel",
  last_contact_at TIMESTAMPTZ,
  stage "LeadStage" NOT NULL DEFAULT 'NEW',
  qualification_status "LeadQualificationStatus" NOT NULL DEFAULT 'UNASSESSED',
  disqualification_reason "LeadDisqualificationReason",
  disqualification_notes TEXT,
  loss_reason "LeadLossReason",
  loss_notes TEXT,
  documents_received_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  won_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  duplicate_of_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  delivery_system "LeadDeliverySystem" NOT NULL DEFAULT 'NONE',
  external_delivery_id TEXT,
  external_delivery_status TEXT,
  external_delivered_at TIMESTAMPTZ,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  assigned_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS public.lead_stage_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage "LeadStage",
  to_stage "LeadStage" NOT NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS leads_assigned_user_id_stage_idx
  ON public.leads (assigned_user_id, stage);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at);
CREATE INDEX IF NOT EXISTS leads_source_created_at_idx ON public.leads (source_created_at);
CREATE INDEX IF NOT EXISTS leads_creative_type_idx ON public.leads (creative_type);
CREATE INDEX IF NOT EXISTS leads_qualification_status_idx ON public.leads (qualification_status);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads (stage);
CREATE INDEX IF NOT EXISTS leads_client_id_idx ON public.leads (client_id);
CREATE INDEX IF NOT EXISTS leads_cellphone_idx ON public.leads (cellphone);
CREATE INDEX IF NOT EXISTS leads_archived_at_idx ON public.leads (archived_at);

CREATE INDEX IF NOT EXISTS lead_assignments_lead_id_assigned_at_idx
  ON public.lead_assignments (lead_id, assigned_at);
CREATE INDEX IF NOT EXISTS lead_assignments_user_id_unassigned_at_idx
  ON public.lead_assignments (user_id, unassigned_at);

CREATE INDEX IF NOT EXISTS lead_stage_histories_lead_id_changed_at_idx
  ON public.lead_stage_histories (lead_id, changed_at);

-- Idempotent external ingestion: one Lead per (source, external_lead_id) when id present
CREATE UNIQUE INDEX IF NOT EXISTS leads_source_external_lead_id_uidx
  ON public.leads (source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lead_assignments FROM anon, authenticated;
ALTER TABLE public.lead_stage_histories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lead_stage_histories FROM anon, authenticated;
