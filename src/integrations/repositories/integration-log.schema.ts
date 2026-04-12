import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntegrationLogDocument = HydratedDocument<IntegrationLogModel>;

@Schema({ collection: 'integration_logs', versionKey: false })
export class IntegrationLogModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: String, required: true })
  operation!: string;

  @Prop({ type: String, required: true, index: true })
  status!: string;

  @Prop({ type: String })
  correlationId?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: Number, default: 0 })
  retryCount!: number;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ type: String, required: true, index: true })
  occurredAt!: string;
}

export const IntegrationLogSchema =
  SchemaFactory.createForClass(IntegrationLogModel);

IntegrationLogSchema.index({ organizationId: 1, occurredAt: -1 });
IntegrationLogSchema.index({ organizationId: 1, provider: 1, status: 1 });
