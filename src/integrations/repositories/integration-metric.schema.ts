import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntegrationMetricDocument =
  HydratedDocument<IntegrationMetricModel>;

@Schema({ collection: 'integration_metrics', versionKey: false })
export class IntegrationMetricModel {
  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: Number, required: true, default: 0 })
  success!: number;

  @Prop({ type: Number, required: true, default: 0 })
  failure!: number;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const IntegrationMetricSchema = SchemaFactory.createForClass(
  IntegrationMetricModel,
);

IntegrationMetricSchema.index(
  { organizationId: 1, provider: 1 },
  { unique: true },
);
