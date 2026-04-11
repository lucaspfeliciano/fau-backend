import { RequestSourceType } from '../../requests/entities/request-source-type.enum';
import { AiExtractedItemType } from './ai-extracted-item-type.enum';
import { AiReviewQueueStatus } from './ai-review-queue-status.enum';
import { AiReviewQueueSuggestedAction } from './ai-review-queue-suggested-action.enum';

export interface AiReviewQueueItemEntity {
  id: string;
  organizationId: string;
  sourceType: RequestSourceType;
  noteExternalId?: string;
  itemType: AiExtractedItemType;
  rawExcerpt: string;
  normalizedText: string;
  confidence: number;
  suggestedTags: string[];
  suggestedAction: AiReviewQueueSuggestedAction;
  matchedRequestId?: string;
  matchedSimilarity?: number;
  status: AiReviewQueueStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resultingRequestId?: string;
}
