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

export const QueryIntegrationLogsSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(50, 200),
  provider: z.string().trim().min(1).max(50).optional(),
  status: z.enum(['success', 'error', 'retrying']).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export type QueryIntegrationLogsInput = z.infer<
  typeof QueryIntegrationLogsSchema
>;
