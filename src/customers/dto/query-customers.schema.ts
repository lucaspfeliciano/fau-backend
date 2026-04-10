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

export const QueryCustomersSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  search: z.string().trim().min(1).max(120).optional(),
  companyId: z.string().trim().min(1).max(100).optional(),
});

export type QueryCustomersInput = z.infer<typeof QueryCustomersSchema>;
