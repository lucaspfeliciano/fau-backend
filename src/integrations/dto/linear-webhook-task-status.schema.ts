import { z } from 'zod';
import { TaskStatus } from '../../engineering/entities/task-status.enum';

export const LinearWebhookTaskStatusSchema = z.object({
  externalIssueId: z.string().trim().min(1).max(160),
  status: z.nativeEnum(TaskStatus),
  timestamp: z.string().trim().min(1).max(40).optional(),
  signature: z.string().trim().min(16).max(256).optional(),
});

export type LinearWebhookTaskStatusInput = z.infer<
  typeof LinearWebhookTaskStatusSchema
>;
