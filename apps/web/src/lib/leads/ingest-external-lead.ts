import {
  LeadSource,
  LeadStage,
} from '@/generated/prisma/enums';
import { getPrisma } from '@/lib/prisma';

function pick(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

/**
 * Ingest a lead from GHL / Meta (flexible payload keys).
 * Idempotent on externalLeadId when provided.
 * Mirrors Nest LeadsService.ingestExternalLead for Vercel serverless.
 */
export async function ingestExternalLead(payload: Record<string, unknown>) {
  const prisma = getPrisma();

  const firstName =
    pick(payload, 'firstName', 'first_name', 'First Name', 'first name') ??
    'Unknown';
  const lastName =
    pick(payload, 'lastName', 'last_name', 'Last Name', 'last name') ?? 'Lead';
  const cellphone = pick(
    payload,
    'cellphone',
    'phone',
    'Phone',
    'phone_number',
    'mobile',
    'Mobile Phone',
  );
  if (!cellphone || cellphone.length < 7) {
    throw new Error(
      'Inbound lead requires a phone number (phone / cellphone)',
    );
  }

  const email = pick(payload, 'email', 'Email', 'email_address');
  const externalLeadId = pick(
    payload,
    'externalLeadId',
    'external_lead_id',
    'lead_id',
    'id',
    'contact_id',
    'contactId',
  );
  const campaignName = pick(
    payload,
    'campaignName',
    'campaign_name',
    'Campaign Name',
    'campaign',
  );
  const adName = pick(payload, 'adName', 'ad_name', 'Ad Name', 'ad');
  const formName = pick(payload, 'formName', 'form_name', 'Form Name', 'form');
  const platform = pick(payload, 'platform', 'Platform') ?? 'facebook';
  const area = pick(payload, 'area', 'city', 'City', 'location');
  const notes = pick(payload, 'notes', 'Notes', 'message', 'Message');
  const sourceDetail =
    pick(payload, 'sourceDetail', 'source_detail') ?? 'GHL webhook';
  const utmSource = pick(payload, 'utm_source', 'utmSource');
  const utmCampaign = pick(payload, 'utm_campaign', 'utmCampaign');

  if (externalLeadId) {
    const existing = await prisma.lead.findFirst({
      where: { externalLeadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cellphone: true,
        stage: true,
        externalLeadId: true,
      },
    });
    if (existing) {
      return {
        ok: true,
        duplicate: true,
        lead: existing,
      };
    }
  }

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        firstName,
        lastName,
        cellphone,
        email,
        area,
        source: LeadSource.META_LEAD_FORM,
        sourceDetail,
        platform,
        campaignName,
        adName,
        formName,
        externalLeadId,
        notes,
        utmSource,
        utmCampaign,
      },
    });
    await tx.leadStageHistory.create({
      data: {
        leadId: created.id,
        fromStage: null,
        toStage: LeadStage.NEW,
        actorUserId: null,
        reason: 'Inbound GHL / Meta lead',
      },
    });
    return created;
  });

  return {
    ok: true,
    duplicate: false,
    lead: {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      cellphone: lead.cellphone,
      stage: lead.stage,
      externalLeadId: lead.externalLeadId,
    },
  };
}
