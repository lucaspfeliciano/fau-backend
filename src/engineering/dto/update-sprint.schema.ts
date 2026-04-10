import { z } from 'zod';
import { SprintStatus } from '../entities/sprint-status.enum';

export const UpdateSprintSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.nativeEnum(SprintStatus).optional(),
    closeReason: z.string().trim().min(5).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;
