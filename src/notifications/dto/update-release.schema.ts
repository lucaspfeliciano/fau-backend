import { z } from 'zod';

export const UpdateReleaseSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  notes: z.string().trim().min(3).max(2000).optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  scheduledAt: z.string().trim().min(1).optional(),
});

export type UpdateReleaseInput = z.infer<typeof UpdateReleaseSchema>;
