import { z } from 'zod';

export const ExtractFeedbackFromNotesSchema = z.object({
  /**
   * The raw text to extract feedback signals from.
   * This is a dry-run: no records are created.
   */
  text: z.string().trim().min(10).max(20000),

  /**
   * Optional label for the source (for display only — not persisted here).
   */
  sourceType: z
    .enum([
      'meeting-notes',
      'sales-conversation',
      'slack-message',
      'fireflies-transcript',
    ])
    .optional()
    .default('meeting-notes'),
});

export type ExtractFeedbackFromNotesInput = z.infer<
  typeof ExtractFeedbackFromNotesSchema
>;

export type ExtractedFeedbackCandidate = {
  /** Stable id used only on the frontend to track selection state */
  candidateId: string;
  title: string;
  description: string;
  type: 'feature-request' | 'bug' | 'pain-point';
  confidence: number;
  suggestedTags: string[];
};

export type ExtractFeedbackFromNotesResult = {
  candidates: ExtractedFeedbackCandidate[];
  totalSegments: number;
};
