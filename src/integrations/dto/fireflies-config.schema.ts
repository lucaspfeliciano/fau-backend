import { z } from 'zod';

export const FirefliesConfigSchema = z.object({
  apiKey: z.string().trim().min(10).max(500),
  workspaceId: z.string().trim().min(1).max(120).optional(),
  projectId: z.string().trim().min(1).max(120).optional(),
  defaultLanguage: z.string().trim().min(2).max(24).optional(),
});

export type FirefliesConfigInput = z.infer<typeof FirefliesConfigSchema>;
