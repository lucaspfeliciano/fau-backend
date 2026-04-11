import { z } from 'zod';

export interface RegisterWithPasswordInput {
  email: string;
  name: string;
  password: string;
  organizationName?: string;
}

export const RegisterWithPasswordSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(72),
  organizationName: z.string().trim().min(2).max(80).optional(),
});
