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

export const QueryDeduplicationAuditSchema = z.object({
  limit: toPositiveInt(50, 200),
});

export type QueryDeduplicationAuditInput = z.infer<
  typeof QueryDeduplicationAuditSchema
>;
