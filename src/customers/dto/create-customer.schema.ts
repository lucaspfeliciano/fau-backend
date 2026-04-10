import { z } from 'zod';

export const CreateCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  companyId: z.string().trim().min(1).max(100).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
