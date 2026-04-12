import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationModel>;

@Schema({ collection: 'notifications', versionKey: false })
export class NotificationModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String })
  teamId?: string;

  @Prop({ type: String, required: true, index: true })
  eventName!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, index: true })
  readAt?: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;
}

export const NotificationSchema =
  SchemaFactory.createForClass(NotificationModel);

NotificationSchema.index({ organizationId: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, eventName: 1, createdAt: -1 });
