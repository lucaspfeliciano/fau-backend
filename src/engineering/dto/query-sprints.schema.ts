import { z } from 'zod';
import { SprintStatus } from '../entities/sprint-status.enum';

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

export const QuerySprintsSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  status: z.nativeEnum(SprintStatus).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type QuerySprintsInput = z.infer<typeof QuerySprintsSchema>;
