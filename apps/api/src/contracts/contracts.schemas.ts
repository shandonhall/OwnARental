import { z } from 'zod';
import { ContractStatus, PlanType } from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const contractFieldsSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  planType: z.nativeEnum(PlanType),
  status: z.nativeEnum(ContractStatus).optional(),
  termMonths: z.coerce.number().int().min(1).max(120),
  monthlyRate: z.union([z.coerce.number().positive(), z.string().min(1)]),
  depositAmount: z
    .union([z.coerce.number().nonnegative(), z.string()])
    .optional(),
  balloonAmount: z.preprocess(
    emptyToNull,
    z.union([z.coerce.number().nonnegative(), z.string()]).nullable().optional(),
  ),
  cipPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(100).nullable().optional(),
  ),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  monthlyKmLimit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable().optional(),
  ),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const createContractSchema = contractFieldsSchema.superRefine(
  (data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
      });
    }
  },
);

export const updateContractSchema = contractFieldsSchema
  .partial()
  .omit({
    clientId: true,
    vehicleId: true,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'endDate must be on or after startDate',
        path: ['endDate'],
      });
    }
  });

export const listContractsQuerySchema = z.object({
  status: z.nativeEnum(ContractStatus).optional(),
  clientId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type UpdateContractDto = z.infer<typeof updateContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
