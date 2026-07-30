import { z } from 'zod';
import { FicaStatus } from '../generated/prisma/enums';

const emptyToNull = (value: unknown) =>
  value === '' || value === undefined ? null : value;

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email().nullable().optional(),
);

const optionalUrl = z.preprocess(
  emptyToNull,
  z.string().url().nullable().optional(),
);

const optionalText = z.preprocess(
  emptyToNull,
  z.string().max(200).nullable().optional(),
);

export const createClientSchema = z.object({
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
  addressLine2: optionalText,
  city: z.string().min(1).max(100),
  province: optionalText,
  postalCode: z.preprocess(
    emptyToNull,
    z.string().max(20).nullable().optional(),
  ),
  ficaStatus: z.nativeEnum(FicaStatus).optional(),
  idDocumentUrl: optionalUrl,
  driversLicenseUrl: optionalUrl,
  payslipsUrl: optionalUrl,
  bankStatementsUrl: optionalUrl,
  proofOfResidenceUrl: optionalUrl,
  handoverPhotosUrls: z.array(z.string().url()).optional(),
  ghlContactId: optionalText,
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listClientsQuerySchema = z.object({
  search: z.string().optional(),
});

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
