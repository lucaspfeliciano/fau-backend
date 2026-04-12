import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HealthEventDocument = HydratedDocument<HealthEventModel>;

@Schema({ collection: 'health_events', versionKey: false })
export class HealthEventModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  component!: string;

  @Prop({ type: String, required: true, index: true })
  severity!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: String, required: true, index: true })
  occurredAt!: string;
}

export const HealthEventSchema = SchemaFactory.createForClass(HealthEventModel);

HealthEventSchema.index({ occurredAt: -1 });
HealthEventSchema.index({ component: 1, occurredAt: -1 });
