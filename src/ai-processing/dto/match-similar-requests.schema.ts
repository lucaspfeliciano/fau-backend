import { z } from 'zod';

export const MatchSimilarRequestsSchema = z.object({
  text: z.string().trim().min(10).max(20000),
  organizationId: z.string().trim().min(1).max(120).optional(),
});

export type MatchSimilarRequestsInput = z.infer<
  typeof MatchSimilarRequestsSchema
>;
