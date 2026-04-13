import { z } from 'zod';

export const CreatePublicVoteSchema = z.object({
  requestId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1).max(120).optional(),
});

export type CreatePublicVoteInput = z.infer<typeof CreatePublicVoteSchema>;
