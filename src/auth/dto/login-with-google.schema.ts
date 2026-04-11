import { z } from 'zod';

export const GoogleProfileSchema = z.object({
  googleId: z.string().trim().min(6).max(128),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(80).optional(),
});

export const GoogleTokenSchema = z
  .object({
    credential: z.string().trim().min(20).optional(),
    googleToken: z.string().trim().min(20).optional(),
    idToken: z.string().trim().min(20).optional(),
    organizationName: z.string().trim().min(2).max(80).optional(),
  })
  .superRefine((value, context) => {
    if (!value.credential && !value.googleToken && !value.idToken) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide googleId/email/name or one of credential/idToken/googleToken.',
        path: ['credential'],
      });
    }
  });

export const LoginWithGoogleSchema = z.union([
  GoogleProfileSchema,
  GoogleTokenSchema,
]);

export type LoginWithGoogleProfileInput = z.infer<typeof GoogleProfileSchema>;
export type LoginWithGoogleTokenInput = z.infer<typeof GoogleTokenSchema>;

export type LoginWithGoogleInput = z.infer<typeof LoginWithGoogleSchema>;
