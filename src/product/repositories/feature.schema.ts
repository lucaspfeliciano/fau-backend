import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeatureDocument = HydratedDocument<FeatureModel>;

@Schema({ _id: false })
class FeatureStatusHistoryEntryModel {
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
class FeatureRequestSourceModel {
  @Prop({ type: String, required: true })
  requestId!: string;

  @Prop({ type: String, required: true })
  sourceType!: string;

  @Prop({ type: String })
  sourceRef?: string;

  @Prop({ type: String })
  ingestedAt?: string;
}

@Schema({ collection: 'features', versionKey: false })
export class FeatureModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String, required: true })
  priority!: string;

  @Prop({ type: Number, required: true })
  priorityScore!: number;

  @Prop({ type: Boolean, required: true })
  isPriorityManual!: boolean;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  initiativeId?: string;

  @Prop({ type: [String], default: [] })
  requestIds!: string[];

  @Prop({ type: [FeatureRequestSourceModel], default: [] })
  requestSources!: FeatureRequestSourceModel[];

  @Prop({ type: [FeatureStatusHistoryEntryModel], default: [] })
  statusHistory!: FeatureStatusHistoryEntryModel[];

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const FeatureSchema = SchemaFactory.createForClass(FeatureModel);

FeatureSchema.index({ organizationId: 1, updatedAt: -1 });
FeatureSchema.index({ organizationId: 1, status: 1, priority: 1 });
FeatureSchema.index({ organizationId: 1, initiativeId: 1 });
FeatureSchema.index({ organizationId: 1, requestIds: 1 });
