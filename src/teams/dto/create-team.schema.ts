import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
