import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SprintDocument = HydratedDocument<SprintModel>;

@Schema({ _id: false })
class SprintStatusHistoryEntryModel {
  @Prop({ type: String, default: null })
  from!: string | null;

  @Prop({ type: String, required: true })
  to!: string;

  @Prop({ type: String, required: true })
  changedBy!: string;

  @Prop({ type: String, required: true })
  changedAt!: string;

  @Prop({ type: String })
  reason?: string;
}

@Schema({ collection: 'sprints', versionKey: false })
export class SprintModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  startDate!: string;

  @Prop({ type: String, required: true })
  endDate!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: String })
  closeReason?: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: [SprintStatusHistoryEntryModel], default: [] })
  statusHistory!: SprintStatusHistoryEntryModel[];

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const SprintSchema = SchemaFactory.createForClass(SprintModel);

SprintSchema.index({ organizationId: 1, updatedAt: -1 });
SprintSchema.index({ organizationId: 1, status: 1 });
