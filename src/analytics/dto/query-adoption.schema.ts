import { z } from 'zod';

const dateString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid datetime value.',
  });

export const QueryAdoptionSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
    teamId: z.string().trim().min(1).optional(),
  })
  .refine((data) => Date.parse(data.startDate) <= Date.parse(data.endDate), {
    message: 'startDate must be before or equal to endDate.',
    path: ['startDate'],
  });

export type QueryAdoptionInput = z.infer<typeof QueryAdoptionSchema>;
