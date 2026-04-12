import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReleaseDocument = HydratedDocument<ReleaseModel>;

@Schema({ collection: 'releases', versionKey: false })
export class ReleaseModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  version!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  notes!: string;

  @Prop({ type: [String], default: [] })
  featureIds!: string[];

  @Prop({ type: [String], default: [] })
  sprintIds!: string[];

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, required: true })
  updatedAt!: string;

  @Prop({ type: String, default: 'draft' })
  status!: string;

  @Prop({ type: String })
  scheduledAt?: string;
}

export const ReleaseSchema = SchemaFactory.createForClass(ReleaseModel);

ReleaseSchema.index({ organizationId: 1, createdAt: -1 });
ReleaseSchema.index({ organizationId: 1, version: 1 });
