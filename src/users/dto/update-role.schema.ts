import { z } from 'zod';

export const UpdateRoleSchema = z.object({
  role: z.enum(['Admin', 'Editor', 'Viewer']),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
