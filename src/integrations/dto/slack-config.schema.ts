import { z } from 'zod';

export const SlackConfigSchema = z.object({
  webhookUrl: z.string().trim().url().max(500),
  defaultChannel: z.string().trim().min(1).max(80).optional(),
});

export type SlackConfigInput = z.infer<typeof SlackConfigSchema>;
