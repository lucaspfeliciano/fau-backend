import { z } from 'zod';
import { TaskStatus } from '../entities/task-status.enum';

const toPositiveInt = (defaultValue: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    max ? z.number().int().min(1).max(max) : z.number().int().min(1),
  );

export const QueryTasksSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  status: z.nativeEnum(TaskStatus).optional(),
  sprintId: z.string().trim().min(1).optional(),
  featureId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type QueryTasksInput = z.infer<typeof QueryTasksSchema>;
