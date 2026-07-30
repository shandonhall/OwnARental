import { z } from 'zod';
import { VehicleStatus } from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const optionalText = z.preprocess(
  emptyToNull,
  z.string().max(200).nullable().optional(),
);

const optionalInt = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) return null;
  if (typeof value === 'string') return Number(value);
  return value;
}, z.number().int().positive().nullable().optional());

export const createVehicleSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1980).max(2100),
  color: optionalText,
  vin: z.string().min(5).max(32),
  registration: z.string().min(3).max(20),
  purchasePrice: z.union([z.coerce.number().positive(), z.string().min(1)]),
  purchaseDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  status: z.nativeEnum(VehicleStatus).optional(),
  monthlyMileageLimit: optionalInt,
  carTrackDeviceId: optionalText,
  warrantyProvider: optionalText,
  warrantyStartDate: z.preprocess(
    emptyToNull,
    z.coerce.date().nullable().optional(),
  ),
  warrantyExpiryDate: z.preprocess(
    emptyToNull,
    z.coerce.date().nullable().optional(),
  ),
  warrantyKmLimit: optionalInt,
  warrantyNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextServiceDueKm: optionalInt,
  nextServiceDueDate: z.preprocess(
    emptyToNull,
    z.coerce.date().nullable().optional(),
  ),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const listVehiclesQuerySchema = z.object({
  status: z.nativeEnum(VehicleStatus).optional(),
  search: z.string().optional(),
});

export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
