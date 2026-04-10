import { z } from 'zod';

export const LinearSyncSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).max(200).optional(),
});

export type LinearSyncInput = z.infer<typeof LinearSyncSchema>;
