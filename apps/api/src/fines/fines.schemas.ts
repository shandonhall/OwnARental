import { z } from 'zod';

export const listFinesQuerySchema = z.object({
  status: z.enum(['UNMATCHED', 'MATCHED', 'INVOICED', 'VOID']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type ListFinesQuery = z.infer<typeof listFinesQuerySchema>;

export const syncFinesSchema = z.object({
  registration: z.string().trim().min(2).max(20).optional(),
});

export type SyncFinesDto = z.infer<typeof syncFinesSchema>;
