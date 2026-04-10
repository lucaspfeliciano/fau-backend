import { z } from 'zod';

export const CreateReleaseSchema = z.object({
  version: z.string().trim().min(1).max(40),
  title: z.string().trim().min(3).max(160),
  notes: z.string().trim().min(3).max(2000),
  featureIds: z.array(z.string().trim().min(1)).max(100).optional(),
  sprintIds: z.array(z.string().trim().min(1)).max(100).optional(),
});

export type CreateReleaseInput = z.infer<typeof CreateReleaseSchema>;
