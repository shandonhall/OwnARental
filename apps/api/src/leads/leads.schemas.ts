import { z } from 'zod';
import {
  LEAD_CONTACT_CHANNELS,
  LEAD_CREATIVE_TYPES,
  LEAD_DISQUALIFICATION_REASONS,
  LEAD_LOSS_REASONS,
  LEAD_QUALIFICATION_STATUSES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from './lead.constants';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable().optional());

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email().nullable().optional(),
);

const optionalUuid = z.union([z.string().uuid(), z.null()]).optional();

const optionalDateTime = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) return null;
  return value;
}, z.coerce.date().nullable().optional());

const leadSourceSchema = z.enum(LEAD_SOURCES);
const creativeTypeSchema = z.enum(LEAD_CREATIVE_TYPES);
const stageSchema = z.enum(LEAD_STAGES);
const qualificationSchema = z.enum(LEAD_QUALIFICATION_STATUSES);
const disqualificationReasonSchema = z.enum(LEAD_DISQUALIFICATION_REASONS);
const lossReasonSchema = z.enum(LEAD_LOSS_REASONS);
const contactChannelSchema = z.enum(LEAD_CONTACT_CHANNELS);

const prospectFields = {
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  cellphone: z.string().min(7).max(30),
  email: optionalEmail,
  area: optionalText(120),
  salaryBand: optionalText(80),
  rentalType: optionalText(120),
  vehicleNeededTiming: optionalText(120),
  vehiclePreference: optionalText(500),
  hasValidDriversLicence: z.boolean().nullable().optional(),
  requestedVehicleId: optionalUuid,
};

const attributionFields = {
  sourceDetail: optionalText(200),
  platform: optionalText(40),
  campaignId: optionalText(120),
  campaignName: optionalText(200),
  adSetId: optionalText(120),
  adSetName: optionalText(200),
  adId: optionalText(120),
  adName: optionalText(200),
  formId: optionalText(120),
  formName: optionalText(200),
  creativeType: creativeTypeSchema.optional(),
  creativeLabel: optionalText(200),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(200),
  utmContent: optionalText(200),
  externalLeadId: optionalText(200),
  sourceCreatedAt: optionalDateTime,
};

export const createLeadSchema = z.object({
  ...prospectFields,
  source: leadSourceSchema,
  ...attributionFields,
  notes: optionalText(4000),
  assignedUserId: optionalUuid,
  duplicateOfLeadId: optionalUuid,
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    cellphone: z.string().min(7).max(30).optional(),
    email: optionalEmail,
    area: optionalText(120),
    salaryBand: optionalText(80),
    rentalType: optionalText(120),
    vehicleNeededTiming: optionalText(120),
    vehiclePreference: optionalText(500),
    hasValidDriversLicence: z.boolean().nullable().optional(),
    requestedVehicleId: optionalUuid,
    notes: optionalText(4000),
    duplicateOfLeadId: optionalUuid,
    clientId: optionalUuid,
    wonContractId: optionalUuid,
    archivedAt: optionalDateTime,
    // Attribution (Admin / LEADS_ASSIGN only — enforced in service)
    source: leadSourceSchema.optional(),
    ...attributionFields,
    mark: z
      .enum([
        'attempt',
        'contacted',
        'qualify',
        'unqualify',
        'request_documents',
        'documents_received',
        'advance',
        'close_won',
        'close_lost',
      ])
      .optional(),
    channel: contactChannelSchema.optional(),
    disqualificationReason: disqualificationReasonSchema.optional(),
    disqualificationNotes: optionalText(2000),
    lossReason: lossReasonSchema.optional(),
    lossNotes: optionalText(2000),
    advanceTo: stageSchema.optional(),
    stage: stageSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;

export const listLeadsQuerySchema = z.object({
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  unassigned: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  stage: stageSchema.optional(),
  qualification: qualificationSchema.optional(),
  creativeType: creativeTypeSchema.optional(),
  source: leadSourceSchema.optional(),
  assignedUserId: z.string().uuid().optional(),
  from: optionalDateTime,
  to: optionalDateTime,
  search: z.string().trim().max(120).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const assignLeadSchema = z.object({
  userId: z.string().uuid(),
  reason: optionalText(500),
});

export type AssignLeadDto = z.infer<typeof assignLeadSchema>;

export const convertClientSchema = z
  .object({
    clientId: z.string().uuid().optional(),
    create: z
      .object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        idNumber: z.string().min(5).max(20),
        email: optionalEmail,
        phone: z.string().min(7).max(20),
        altPhone: z.preprocess(
          emptyToNull,
          z.string().min(7).max(20).nullable().optional(),
        ),
        addressLine1: z.string().min(1).max(200),
        addressLine2: optionalText(200),
        city: z.string().min(1).max(100),
        province: optionalText(100),
        postalCode: z.preprocess(
          emptyToNull,
          z.string().max(20).nullable().optional(),
        ),
        notes: optionalText(4000),
      })
      .optional(),
  })
  .refine((data) => Boolean(data.clientId) !== Boolean(data.create), {
    message: 'Provide exactly one of clientId or create',
  });

export type ConvertClientDto = z.infer<typeof convertClientSchema>;

export const creativeReportQuerySchema = z.object({
  from: optionalDateTime,
  to: optionalDateTime,
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type CreativeReportQuery = z.infer<typeof creativeReportQuerySchema>;

/** Normalised inbound ingestion payload (trusted automation). */
export const ingestLeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  cellphone: z.string().min(7).max(30),
  email: optionalEmail,
  area: optionalText(120),
  salaryBand: optionalText(80),
  rentalType: optionalText(120),
  vehicleNeededTiming: optionalText(120),
  vehiclePreference: optionalText(500),
  hasValidDriversLicence: z.boolean().nullable().optional(),
  source: leadSourceSchema.default('META_LEAD_FORM'),
  platform: optionalText(40),
  sourceDetail: optionalText(200),
  externalLeadId: z.string().min(1).max(200),
  sourceCreatedAt: optionalDateTime,
  campaignId: optionalText(120),
  campaignName: optionalText(200),
  adSetId: optionalText(120),
  adSetName: optionalText(200),
  adId: optionalText(120),
  adName: optionalText(200),
  formId: optionalText(120),
  formName: optionalText(200),
  creativeType: creativeTypeSchema.optional().default('UNKNOWN'),
  creativeLabel: optionalText(200),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(200),
  utmContent: optionalText(200),
  notes: optionalText(4000),
});

export type IngestLeadDto = z.infer<typeof ingestLeadSchema>;
