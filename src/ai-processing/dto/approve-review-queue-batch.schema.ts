import { z } from 'zod';

export const ApproveReviewQueueBatchSchema = z.object({
  itemIds: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
});

export type ApproveReviewQueueBatchInput = z.infer<
  typeof ApproveReviewQueueBatchSchema
>;
