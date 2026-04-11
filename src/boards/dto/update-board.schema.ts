import { z } from 'zod';

export const UpdateBoardSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z
      .union([z.string().trim().min(1).max(240), z.null()])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;
