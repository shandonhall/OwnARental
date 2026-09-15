import { z } from 'zod';
import {
  LeadContactChannel,
  LeadDisqualificationReason,
  LeadLossReason,
  LeadQualificationStatus,
  LeadSource,
  LeadStage,
} from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().max(500).nullable().optional(),
);

export const LEAD_STAGES: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.QUALIFYING,
  LeadStage.DOCUMENTS_REQUESTED,
  LeadStage.APPLICATION_SUBMITTED,
  LeadStage.APPROVED,
  LeadStage.VEHICLE_SELECTED,
  LeadStage.CLOSED_WON,
  LeadStage.CLOSED_LOST,
];

export const listLeadsQuerySchema = z.object({
  search: z.string().max(120).optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  assignedUserId: z.string().uuid().optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  cellphone: z.string().min(7).max(30),
  email: z.preprocess(
    emptyToNull,
    z.string().email().nullable().optional(),
  ),
  area: optionalText,
  salaryBand: optionalText,
  rentalType: optionalText,
  vehicleNeededTiming: optionalText,
  vehiclePreference: optionalText,
  hasValidDriversLicence: z.boolean().nullable().optional(),
  source: z.nativeEnum(LeadSource).optional(),
  sourceDetail: optionalText,
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial().extend({
  requestedVehicleId: z.preprocess(
    emptyToNull,
    z.string().uuid().nullable().optional(),
  ),
});

export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;

export const updateLeadStageSchema = z.object({
  stage: z.nativeEnum(LeadStage),
  reason: optionalText,
  lossReason: z.nativeEnum(LeadLossReason).nullable().optional(),
  lossNotes: optionalText,
});

export type UpdateLeadStageDto = z.infer<typeof updateLeadStageSchema>;

export const assignLeadSchema = z.object({
  userId: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  reason: optionalText,
});

export type AssignLeadDto = z.infer<typeof assignLeadSchema>;

export const qualifyLeadSchema = z
  .object({
    qualificationStatus: z.nativeEnum(LeadQualificationStatus),
    disqualificationReason: z
      .nativeEnum(LeadDisqualificationReason)
      .nullable()
      .optional(),
    disqualificationNotes: optionalText,
  })
  .refine(
    (value) =>
      value.qualificationStatus !== LeadQualificationStatus.UNQUALIFIED ||
      Boolean(value.disqualificationReason),
    { message: 'Disqualification reason is required' },
  );

export type QualifyLeadDto = z.infer<typeof qualifyLeadSchema>;

export const logLeadContactSchema = z.object({
  outcome: z.enum(['attempted', 'reached']),
  channel: z.nativeEnum(LeadContactChannel),
});

export type LogLeadContactDto = z.infer<typeof logLeadContactSchema>;
