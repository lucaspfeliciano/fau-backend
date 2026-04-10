import { z } from 'zod';
import { TaskStatus } from '../entities/task-status.enum';

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    featureId: z.string().trim().min(1).optional(),
    sprintId: z.union([z.string().trim().min(1), z.null()]).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    estimate: z.number().min(0).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
