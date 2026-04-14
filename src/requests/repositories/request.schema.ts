import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestDocument = HydratedDocument<RequestModel>;

@Schema({ _id: false })
class RequestStatusHistoryModel {
  @Prop({ type: String, default: null })
  from!: string | null;

  @Prop({ type: String, required: true })
  to!: string;

  @Prop({ type: String, required: true })
  changedBy!: string;

  @Prop({ type: String, required: true })
  changedAt!: string;
}

@Schema({ _id: false })
class RequestDeduplicationEvidenceModel {
  @Prop({ type: String, required: true })
  recordedAt!: string;

  @Prop({ type: String })
  recordedBy?: string;

  @Prop({ type: String, required: true })
  sourceType!: string;

  @Prop({ type: String })
  sourceRef?: string;

  @Prop({ type: String })
  summary?: string;

  @Prop({ type: Number })
  similarityScore?: number;

  @Prop({ type: String })
  linkedRequestId?: string;

  @Prop({ type: String })
  mergedRequestId?: string;

  @Prop({ type: String, required: true })
  decision!: string;
}

@Schema({ _id: false })
class RequestMergeHistoryModel {
  @Prop({ type: String, required: true })
  mergeId!: string;

  @Prop({ type: String, required: true })
  occurredAt!: string;

  @Prop({ type: String })
  actorId?: string;

  @Prop({ type: String, required: true })
  mode!: string;

  @Prop({ type: String, required: true })
  sourceRequestId!: string;

  @Prop({ type: String, required: true })
  targetRequestId!: string;

  @Prop({ type: Number })
  similarityScore?: number;

  @Prop({ type: String })
  reason?: string;
}

@Schema({ collection: 'requests', versionKey: false })
export class RequestModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, index: true })
  organizationId?: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  feedbackIds!: string[];

  @Prop({ type: [String], default: [] })
  customerIds!: string[];

  @Prop({ type: [String], default: [] })
  problems!: string[];

  @Prop({ type: [String], default: [] })
  solutions!: string[];

  @Prop({ type: String })
  product?: string;

  @Prop({ type: String })
  functionality?: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;

  // Legacy compatibility fields.
  @Prop({ type: String, index: true })
  boardId?: string;

  @Prop({ type: Number, default: 1 })
  votes?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  companyIds?: string[];

  @Prop({ type: String })
  sourceType?: string;

  @Prop({ type: String })
  sourceRef?: string;

  @Prop({ type: String })
  ingestedAt?: string;

  @Prop({ type: String })
  publicSubmitterName?: string;

  @Prop({ type: String })
  publicSubmitterEmail?: string;

  @Prop({ type: String, index: true })
  mergedIntoRequestId?: string;

  @Prop({ type: [String], default: [] })
  mergedRequestIds?: string[];

  @Prop({ type: [RequestDeduplicationEvidenceModel], default: [] })
  deduplicationEvidence?: RequestDeduplicationEvidenceModel[];

  @Prop({ type: [RequestMergeHistoryModel], default: [] })
  mergeHistory?: RequestMergeHistoryModel[];

  @Prop({ type: [RequestStatusHistoryModel], default: [] })
  statusHistory!: RequestStatusHistoryModel[];

  @Prop({ type: String })
  deletedAt?: string;
}

export const RequestSchema = SchemaFactory.createForClass(RequestModel);

RequestSchema.index({ workspaceId: 1, updatedAt: -1 });
RequestSchema.index({ workspaceId: 1, status: 1, deletedAt: 1 });
RequestSchema.index({ workspaceId: 1, boardId: 1, deletedAt: 1 });
RequestSchema.index({ workspaceId: 1, mergedIntoRequestId: 1, deletedAt: 1 });
RequestSchema.index({ organizationId: 1, updatedAt: -1 });
