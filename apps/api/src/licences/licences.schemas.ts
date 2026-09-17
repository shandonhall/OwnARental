import { z } from 'zod';
import { LicenceRenewalStatus } from '../generated/prisma/enums';

const optionalUuid = z.union([z.string().uuid(), z.null()]).optional();
const optionalMoney = z
  .union([z.coerce.number().nonnegative(), z.null()])
  .optional();
const optionalNotes = z.union([z.string().max(4000), z.null()]).optional();

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date');

export const createLicenceSchema = z.object({
  vehicleId: z.string().uuid(),
  expiryDate: dateOnly,
  responsibleUserId: optionalUuid,
  renewalCost: optionalMoney,
  notes: optionalNotes,
  /** When true (default), snapshot active contract/client if present. */
  snapshotAssignment: z.boolean().optional().default(true),
});

export type CreateLicenceDto = z.infer<typeof createLicenceSchema>;

export const updateLicenceSchema = z
  .object({
    responsibleUserId: optionalUuid,
    renewalCost: optionalMoney,
    notes: optionalNotes,
    renewedExpiryDate: z.union([dateOnly, z.null()]).optional(),
    contractId: optionalUuid,
    clientId: optionalUuid,
    status: z.nativeEnum(LicenceRenewalStatus).optional(),
    mark: z
      .enum([
        'start',
        'renewed',
        'received',
        'sent',
        'collected',
        'cancel',
        'client_notified',
      ])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateLicenceDto = z.infer<typeof updateLicenceSchema>;

export const listLicencesQuerySchema = z.object({
  urgency: z
    .enum(['OK', 'WARN_60', 'ACTION_30', 'EXPIRED', 'ALL'])
    .optional()
    .default('ALL'),
  pipeline: z.enum(['OPEN', 'TERMINAL', 'ALL']).optional().default('OPEN'),
  status: z.nativeEnum(LicenceRenewalStatus).optional(),
  responsibleUserId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});

export type ListLicencesQuery = z.infer<typeof listLicencesQuerySchema>;
