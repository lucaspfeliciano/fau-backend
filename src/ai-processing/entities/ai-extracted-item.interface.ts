import { AiExtractedItemType } from './ai-extracted-item-type.enum';

export interface AiExtractedItem {
  rawExcerpt: string;
  normalizedText: string;
  type: AiExtractedItemType;
  confidence: number;
  requiresHumanReview: boolean;
  suggestedTags: string[];
}
