import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExternalMappingDocument = HydratedDocument<ExternalMappingModel>;

@Schema({ collection: 'external_mappings', versionKey: false })
export class ExternalMappingModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: String, required: true, index: true })
  entityType!: string;

  @Prop({ type: String, required: true, index: true })
  internalId!: string;

  @Prop({ type: String, required: true, index: true })
  externalId!: string;

  @Prop({ type: String, required: true })
  syncedAt!: string;
}

export const ExternalMappingSchema =
  SchemaFactory.createForClass(ExternalMappingModel);

ExternalMappingSchema.index(
  { organizationId: 1, provider: 1, entityType: 1, internalId: 1 },
  { unique: true },
);
ExternalMappingSchema.index({ organizationId: 1, provider: 1, externalId: 1 });
