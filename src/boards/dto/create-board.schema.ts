import { z } from 'zod';

export const CreateBoardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(240).optional(),
});

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
