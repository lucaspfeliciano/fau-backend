import { z } from 'zod';

export const UpdateChangelogEntrySchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    publishedAt: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateChangelogEntryInput = z.infer<
  typeof UpdateChangelogEntrySchema
>;
