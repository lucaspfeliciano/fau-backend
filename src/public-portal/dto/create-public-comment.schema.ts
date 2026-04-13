import { z } from 'zod';

export const CreatePublicCommentSchema = z.object({
  requestId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(2000),
  publicAuthorName: z.string().trim().min(2).max(120),
  publicAuthorEmail: z.email().trim().min(5).max(160),
});

export type CreatePublicCommentInput = z.infer<
  typeof CreatePublicCommentSchema
>;
