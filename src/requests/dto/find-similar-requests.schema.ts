import { z } from 'zod';

export const FindSimilarRequestsSchema = z.object({
  title: z.string().trim().min(3).max(180),
  details: z.string().trim().min(3).max(2000),
  boardId: z.string().trim().min(1).max(120).optional(),
  customerId: z.string().trim().min(1).max(120).optional(),
});

export type FindSimilarRequestsInput = z.infer<
  typeof FindSimilarRequestsSchema
>;
