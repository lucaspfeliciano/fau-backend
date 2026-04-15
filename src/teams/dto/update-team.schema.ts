import { z } from 'zod';

export const UpdateTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
