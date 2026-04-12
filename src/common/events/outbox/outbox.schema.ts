import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutboxEventDocument = HydratedDocument<OutboxEventModel>;

export type OutboxEventStatus = 'pending' | 'completed' | 'dead_letter';

@Schema({ collection: 'domain_event_outbox', versionKey: false })
export class OutboxEventModel {
  @Prop({ type: String, required: true, unique: true })
  eventId!: string;

  @Prop({ type: String, index: true })
  organizationId?: string;

  @Prop({ type: String, required: true, index: true })
  status!: OutboxEventStatus;

  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Date })
  nextRetryAt?: Date;

  @Prop({ type: Object, required: true })
  serializedEvent!: Record<string, unknown>;

  @Prop({ type: String })
  lastError?: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date })
  processedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEventModel);

OutboxEventSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
OutboxEventSchema.index({ organizationId: 1, 'serializedEvent.occurredAt': 1 });
OutboxEventSchema.index({ 'serializedEvent.name': 1 });
OutboxEventSchema.index({ 'serializedEvent.actorId': 1 });
