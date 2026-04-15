import { z } from 'zod';

export const CreatePublicRequestPathVoteSchema = z.object({
  visitorId: z.string().trim().min(1).max(120).optional(),
});

export type CreatePublicRequestPathVoteInput = z.infer<
  typeof CreatePublicRequestPathVoteSchema
>;
