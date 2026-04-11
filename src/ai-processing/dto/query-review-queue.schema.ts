import { z } from 'zod';
import { AiReviewQueueStatus } from '../entities/ai-review-queue-status.enum';

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

export const QueryReviewQueueSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  status: z.nativeEnum(AiReviewQueueStatus).optional(),
});

export type QueryReviewQueueInput = z.infer<typeof QueryReviewQueueSchema>;
