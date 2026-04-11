import { z } from 'zod';

export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

export const LoginWithPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});
