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

export const QueryPublicFeedbacksSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  search: z.string().trim().min(1).max(120).optional(),
  sessionId: z.string().trim().max(200).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  sortBy: z.enum(['recent', 'votes']).optional().default('recent'),
});

export type QueryPublicFeedbacksInput = z.infer<
  typeof QueryPublicFeedbacksSchema
>;
