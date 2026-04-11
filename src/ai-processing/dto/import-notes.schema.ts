import { z } from 'zod';
import { RequestSourceType } from '../../requests/entities/request-source-type.enum';

export const ImportNotesSchema = z.object({
  sourceType: z.enum([
    RequestSourceType.MeetingNotes,
    RequestSourceType.SalesConversation,
    RequestSourceType.SlackMessage,
    RequestSourceType.FirefliesTranscript,
  ]),
  noteExternalId: z.string().trim().min(1).max(120).optional(),
  text: z.string().trim().min(10).max(20000),
  timeoutMs: z.number().int().min(200).max(10000).optional(),
});

export type ImportNotesInput = z.infer<typeof ImportNotesSchema>;
