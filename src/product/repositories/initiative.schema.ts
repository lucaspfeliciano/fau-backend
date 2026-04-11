import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InitiativeDocument = HydratedDocument<InitiativeModel>;

@Schema({ _id: false })
class InitiativeStatusHistoryEntryModel {
  @Prop({ type: String, default: null })
  from!: string | null;

  @Prop({ type: String, required: true })
  to!: string;

  @Prop({ type: String, required: true })
  changedBy!: string;

  @Prop({ type: String, required: true })
  changedAt!: string;
}

@Schema({ collection: 'initiatives', versionKey: false })
export class InitiativeModel {
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

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: [String], default: [] })
  featureIds!: string[];

  @Prop({ type: [InitiativeStatusHistoryEntryModel], default: [] })
  statusHistory!: InitiativeStatusHistoryEntryModel[];

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const InitiativeSchema = SchemaFactory.createForClass(InitiativeModel);

InitiativeSchema.index({ organizationId: 1, updatedAt: -1 });
InitiativeSchema.index({ organizationId: 1, status: 1, priority: 1 });
