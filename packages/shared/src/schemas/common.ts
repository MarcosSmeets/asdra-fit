import { z } from 'zod';

export const uuidSchema = z.string().uuid();

/** ISO 8601 com offset/Z (aceita Z e offsets). */
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
