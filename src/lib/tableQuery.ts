import { z } from 'zod';

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

export const TableQuery = z.object({
  cursor: z.string().optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  pageSize: z.coerce
    .number()
    .refine((size) => PAGE_SIZES.includes(size))
    .optional()
    .catch(undefined),
});
export type TableQuery = z.infer<typeof TableQuery>;
