import { z } from 'zod';

export const MergeRequestsSchema = z.object({
  sourceRequestId: z.string().trim().min(1).max(120),
  targetRequestId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(3).max(300).optional(),
});

export type MergeRequestsInput = z.infer<typeof MergeRequestsSchema>;
