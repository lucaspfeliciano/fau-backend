import { z } from 'zod';

const toPositiveInt = (defaultValue: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    max ? z.number().int().min(1).max(max) : z.number().int().min(1),
  );

export const QueryUsersSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(50, 200),
  search: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['Admin', 'Editor', 'Viewer']).optional(),
});

export type QueryUsersInput = z.infer<typeof QueryUsersSchema>;
