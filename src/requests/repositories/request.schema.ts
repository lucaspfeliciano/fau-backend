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

@Schema({ collection: 'requests', versionKey: false })
export class RequestModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: String, index: true })
  boardId?: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: Number, required: true })
  votes!: number;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: [String], default: [] })
  customerIds!: string[];

  @Prop({ type: [String], default: [] })
  companyIds!: string[];

  @Prop({ type: String, required: true })
  sourceType!: string;

  @Prop({ type: String })
  sourceRef?: string;

  @Prop({ type: String })
  ingestedAt?: string;

  @Prop({ type: [RequestStatusHistoryModel], default: [] })
  statusHistory!: RequestStatusHistoryModel[];

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;

  @Prop({ type: String })
  deletedAt?: string;
}

export const RequestSchema = SchemaFactory.createForClass(RequestModel);

RequestSchema.index({ organizationId: 1, updatedAt: -1 });
RequestSchema.index({ organizationId: 1, status: 1, deletedAt: 1 });
RequestSchema.index({ organizationId: 1, boardId: 1, deletedAt: 1 });
