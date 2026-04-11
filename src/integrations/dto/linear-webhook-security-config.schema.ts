import { z } from 'zod';

export const LinearWebhookSecurityConfigSchema = z.object({
  signingSecret: z.string().trim().min(16).max(500),
  toleranceSeconds: z.number().int().min(30).max(3600).default(300),
});

export type LinearWebhookSecurityConfigInput = z.infer<
  typeof LinearWebhookSecurityConfigSchema
>;
