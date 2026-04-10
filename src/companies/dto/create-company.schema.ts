import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  revenue: z.number().min(0).max(1_000_000_000_000).optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
