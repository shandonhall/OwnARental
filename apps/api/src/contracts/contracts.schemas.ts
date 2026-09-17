import { z } from 'zod';
import { ContractStatus, PlanType } from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const optionalNonNegativeMoney = z.preprocess(
  emptyToNull,
  z
    .union([z.coerce.number().nonnegative(), z.string().min(1)])
    .nullable()
    .optional(),
);

const optionalNullableBoolean = z.preprocess((value) => {
  if (value === '' || value === undefined) return null;
  if (value === null) return null;
  if (value === true || value === 'true' || value === 'yes') return true;
  if (value === false || value === 'false' || value === 'no') return false;
  return value;
}, z.boolean().nullable().optional());

const contractFieldsSchema = z.object({
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  agreementNumber: z.preprocess((value) => {
    if (value === '' || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value;
  }, z.string().min(1).max(80).nullable().optional()),
  planType: z.nativeEnum(PlanType),
  status: z.nativeEnum(ContractStatus).optional(),
  termMonths: z.coerce.number().int().min(1).max(120),
  monthlyRate: z.union([z.coerce.number().positive(), z.string().min(1)]),
  depositAmount: z
    .union([z.coerce.number().nonnegative(), z.string()])
    .optional(),
  balloonAmount: z.preprocess(
    emptyToNull,
    z
      .union([z.coerce.number().nonnegative(), z.string()])
      .nullable()
      .optional(),
  ),
  cipPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(100).nullable().optional(),
  ),
  cipAmount: optionalNonNegativeMoney,
  vehicleValue: optionalNonNegativeMoney,
  initialOnRoadCosts: optionalNonNegativeMoney,
  vehicleRentalAmount: optionalNonNegativeMoney,
  administrationAmount: optionalNonNegativeMoney,
  warrantyAmount: optionalNonNegativeMoney,
  servicePlanAmount: optionalNonNegativeMoney,
  trackingAmount: optionalNonNegativeMoney,
  licenceFeeAmount: optionalNonNegativeMoney,
  insuranceAmount: optionalNonNegativeMoney,
  lifeInsuranceAmount: optionalNonNegativeMoney,
  otherMonthlyAmount: optionalNonNegativeMoney,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  monthlyKmLimit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable().optional(),
  ),
  annualKmLimit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable().optional(),
  ),
  rentalDueDay: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(31).nullable().optional(),
  ),
  vehicleKeptAddress: z.preprocess(
    emptyToNull,
    z.string().max(500).nullable().optional(),
  ),
  lifeInsuranceAccepted: optionalNullableBoolean,
  initialRegistrationComplete: optionalNullableBoolean,
  initialLicensingComplete: optionalNullableBoolean,
  insuranceComplete: optionalNullableBoolean,
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

function refineDates(
  data: { startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx,
) {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: 'custom',
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    });
  }
}

export const createContractSchema = contractFieldsSchema.superRefine(
  (data, ctx) => {
    refineDates(data, ctx);
  },
);

export const updateContractSchema = contractFieldsSchema
  .partial()
  .omit({
    clientId: true,
    vehicleId: true,
  })
  .superRefine((data, ctx) => {
    refineDates(data, ctx);
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
