import { z } from 'zod';

export const LoginWithGoogleSchema = z.object({
  googleId: z.string().trim().min(6).max(128),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(80).optional(),
});

export type LoginWithGoogleInput = z.infer<typeof LoginWithGoogleSchema>;
