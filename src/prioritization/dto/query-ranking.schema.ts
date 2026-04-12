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

export const QueryRankingSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(50, 100),
  sortOrder: z.enum(['desc', 'asc']).optional().default('desc'),
});

export type QueryRankingInput = z.infer<typeof QueryRankingSchema>;
