import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<OrganizationModel>;

@Schema({ collection: 'organizations', versionKey: false })
export class OrganizationModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String })
  widgetApiKey?: string;

  @Prop({ type: Boolean, required: true, default: false })
  widgetEnabled!: boolean;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  subtitle?: string;

  @Prop({ type: Boolean, required: true, default: false })
  publicPortalEnabled!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  publicRoadmapEnabled!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  publicChangelogEnabled!: boolean;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const OrganizationSchema =
  SchemaFactory.createForClass(OrganizationModel);

OrganizationSchema.index({ slug: 1 }, { unique: true });
