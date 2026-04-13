import { z } from 'zod';

export const CreatePublicRequestSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  boardId: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  publicSubmitterName: z.string().trim().min(2).max(120),
  publicSubmitterEmail: z.email().trim().min(5).max(160),
});

export type CreatePublicRequestInput = z.infer<
  typeof CreatePublicRequestSchema
>;
