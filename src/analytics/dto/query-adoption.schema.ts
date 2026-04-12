import { z } from 'zod';

export const QueryAdoptionSchema = z.object({
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  teamId: z.string().trim().min(1).optional(),
});

export type QueryAdoptionInput = z.infer<typeof QueryAdoptionSchema>;
