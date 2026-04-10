import { z } from 'zod';

export const UpdateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    companyId: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
