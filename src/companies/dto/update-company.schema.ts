import { z } from 'zod';

export const UpdateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    revenue: z.number().min(0).max(1_000_000_000_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
