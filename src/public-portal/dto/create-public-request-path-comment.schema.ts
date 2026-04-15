import { z } from 'zod';

export const CreatePublicRequestPathCommentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email().trim().min(5).max(160).optional(),
});

export type CreatePublicRequestPathCommentInput = z.infer<
  typeof CreatePublicRequestPathCommentSchema
>;
