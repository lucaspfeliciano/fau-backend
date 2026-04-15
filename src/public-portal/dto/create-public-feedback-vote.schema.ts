import { z } from 'zod';

export const CreatePublicFeedbackVoteSchema = z.object({
  feedbackId: z.string().uuid(),
  sessionId: z.string().trim().min(1).max(200).optional(),
});

export type CreatePublicFeedbackVoteInput = z.infer<
  typeof CreatePublicFeedbackVoteSchema
>;
