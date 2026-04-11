import { z } from 'zod';

export const CreateRequestCommentSchema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

export type CreateRequestCommentInput = z.infer<
  typeof CreateRequestCommentSchema
>;
