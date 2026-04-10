import { z } from 'zod';

export const SlackImportMessageSchema = z.object({
  text: z.string().trim().min(10).max(10000),
  noteExternalId: z.string().trim().min(1).max(120).optional(),
});

export type SlackImportMessageInput = z.infer<typeof SlackImportMessageSchema>;
