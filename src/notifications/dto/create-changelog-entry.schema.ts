import { z } from 'zod';

export const CreateChangelogEntrySchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(2000),
  publishedAt: z.string().trim().min(1).optional(),
});

export type CreateChangelogEntryInput = z.infer<
  typeof CreateChangelogEntrySchema
>;
