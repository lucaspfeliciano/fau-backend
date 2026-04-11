import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestSourceType } from '../../requests/entities/request-source-type.enum';
import { AiExtractedItemType } from '../entities/ai-extracted-item-type.enum';
import { AiReviewQueueStatus } from '../entities/ai-review-queue-status.enum';
import { AiReviewQueueSuggestedAction } from '../entities/ai-review-queue-suggested-action.enum';

export type AiReviewQueueItemDocument =
  HydratedDocument<AiReviewQueueItemModel>;

@Schema({ collection: 'ai_review_queue', versionKey: false })
export class AiReviewQueueItemModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(RequestSourceType),
  })
  sourceType!: RequestSourceType;

  @Prop({ type: String })
  noteExternalId?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AiExtractedItemType),
  })
  itemType!: AiExtractedItemType;

  @Prop({ type: String, required: true })
  rawExcerpt!: string;

  @Prop({ type: String, required: true })
  normalizedText!: string;

  @Prop({ type: Number, required: true })
  confidence!: number;

  @Prop({ type: [String], required: true })
  suggestedTags!: string[];

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AiReviewQueueSuggestedAction),
  })
  suggestedAction!: AiReviewQueueSuggestedAction;

  @Prop({ type: String })
  matchedRequestId?: string;

  @Prop({ type: Number })
  matchedSimilarity?: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AiReviewQueueStatus),
    index: true,
  })
  status!: AiReviewQueueStatus;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String })
  resolvedAt?: string;

  @Prop({ type: String })
  resolvedBy?: string;

  @Prop({ type: String })
  resultingRequestId?: string;
}

export const AiReviewQueueItemSchema = SchemaFactory.createForClass(
  AiReviewQueueItemModel,
);

AiReviewQueueItemSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
