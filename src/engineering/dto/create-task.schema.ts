import { z } from 'zod';
import { TaskStatus } from '../entities/task-status.enum';

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  featureId: z.string().trim().min(1),
  sprintId: z.string().trim().min(1).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  estimate: z.number().min(0).max(1000).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
