import { z } from 'zod';

export const FindSimilarPublicRequestsSchema = z.object({
  title: z.string().trim().min(3).max(180),
  details: z.string().trim().min(3).max(2000).optional(),
});

export type FindSimilarPublicRequestsInput = z.infer<
  typeof FindSimilarPublicRequestsSchema
>;
