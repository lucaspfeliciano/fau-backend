import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TaskDocument = HydratedDocument<TaskModel>;

@Schema({ _id: false })
class TaskStatusHistoryEntryModel {
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

@Schema({ collection: 'tasks', versionKey: false })
export class TaskModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: String, required: true, index: true })
  featureId!: string;

  @Prop({ type: String, index: true })
  sprintId?: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: Number })
  estimate?: number;

  @Prop({ type: [FeatureRequestSourceModel], default: [] })
  requestSources!: FeatureRequestSourceModel[];

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: [TaskStatusHistoryEntryModel], default: [] })
  statusHistory!: TaskStatusHistoryEntryModel[];

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const TaskSchema = SchemaFactory.createForClass(TaskModel);

TaskSchema.index({ organizationId: 1, updatedAt: -1 });
TaskSchema.index({ organizationId: 1, status: 1, sprintId: 1, featureId: 1 });
