import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditEventDocument = HydratedDocument<AuditEventModel>;

@Schema({ collection: 'audit_events', versionKey: false })
export class AuditEventModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  actorId!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String, required: true })
  resourceType!: string;

  @Prop({ type: String })
  resourceId?: string;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ type: String, required: true, index: true })
  occurredAt!: string;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEventModel);

AuditEventSchema.index({ organizationId: 1, occurredAt: -1 });
AuditEventSchema.index({ organizationId: 1, action: 1 });
AuditEventSchema.index({ organizationId: 1, actorId: 1, occurredAt: -1 });
