import { z } from 'zod';
import { TaskStatus } from '../../engineering/entities/task-status.enum';

export const LinearWebhookTaskStatusSchema = z.object({
  externalIssueId: z.string().trim().min(1).max(160),
  status: z.nativeEnum(TaskStatus),
});

export type LinearWebhookTaskStatusInput = z.infer<
  typeof LinearWebhookTaskStatusSchema
>;
