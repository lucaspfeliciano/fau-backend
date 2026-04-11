import { z } from 'zod';

export const FirefliesImportTranscriptSchema = z.object({
  externalTranscriptId: z.string().trim().min(1).max(180),
  title: z.string().trim().min(3).max(180),
  transcriptText: z.string().trim().min(10).max(30000),
  happenedAt: z.string().datetime().optional(),
  participants: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});

export type FirefliesImportTranscriptInput = z.infer<
  typeof FirefliesImportTranscriptSchema
>;
