import { z } from 'zod';

/** Query validation for GET /notifications (limit raised to support categorized inbox). */
export const listNotificationsQuerySchema = z.object({
  includeRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value == null ? true : value === 'true')),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
