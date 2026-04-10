import { z } from 'zod';
import { SprintStatus } from '../entities/sprint-status.enum';

export const CreateSprintSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.nativeEnum(SprintStatus).optional(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    message: 'startDate must be before or equal to endDate.',
    path: ['endDate'],
  });

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
