import { z } from 'zod';
import { LedgerEntryStatus, LedgerEntryType } from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

export const createLedgerEntrySchema = z.object({
  type: z.nativeEnum(LedgerEntryType),
  status: z.nativeEnum(LedgerEntryStatus).optional(),
  amount: z.union([z.coerce.number().positive(), z.string().min(1)]),
  currency: z.string().length(3).optional(),
  dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  paidAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  reference: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const updateLedgerEntrySchema = createLedgerEntrySchema.partial();

export type CreateLedgerEntryDto = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntryDto = z.infer<typeof updateLedgerEntrySchema>;
