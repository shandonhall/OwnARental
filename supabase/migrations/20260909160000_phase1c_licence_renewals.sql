-- Phase 1C: vehicle licence renewal cycles (operational / historical).
-- Additive only. Does not invent expiry dates for existing vehicles.
-- Does not alter Contract.licence_fee_amount or initial_licensing_complete.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LicenceRenewalStatus') THEN
    CREATE TYPE "LicenceRenewalStatus" AS ENUM (
      'OPEN',
      'IN_PROGRESS',
      'RENEWED',
      'RECEIVED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'NotificationKind' AND e.enumlabel = 'LICENCE_DUE'
  ) THEN
    ALTER TYPE "NotificationKind" ADD VALUE 'LICENCE_DUE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.licence_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expiry_date DATE NOT NULL,
  renewed_expiry_date DATE,
  renewal_cost DECIMAL(12, 2),
  status "LicenceRenewalStatus" NOT NULL DEFAULT 'OPEN',
  client_notified_at TIMESTAMPTZ,
  renewal_started_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS licence_renewals_vehicle_id_expiry_date_idx
  ON public.licence_renewals (vehicle_id, expiry_date);

CREATE INDEX IF NOT EXISTS licence_renewals_status_expiry_date_idx
  ON public.licence_renewals (status, expiry_date);

CREATE INDEX IF NOT EXISTS licence_renewals_responsible_user_id_idx
  ON public.licence_renewals (responsible_user_id);

CREATE INDEX IF NOT EXISTS licence_renewals_expiry_date_idx
  ON public.licence_renewals (expiry_date);

-- At most one non-terminal cycle per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS licence_renewals_one_open_per_vehicle_idx
  ON public.licence_renewals (vehicle_id)
  WHERE status NOT IN ('COMPLETED', 'CANCELLED');

ALTER TABLE public.licence_renewals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.licence_renewals FROM anon, authenticated;
