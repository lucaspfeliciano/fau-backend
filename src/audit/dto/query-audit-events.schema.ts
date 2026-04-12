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

export const QueryAuditEventsSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(50, 200),
  actorId: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export type QueryAuditEventsInput = z.infer<typeof QueryAuditEventsSchema>;
