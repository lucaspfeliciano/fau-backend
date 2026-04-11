import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationPreferenceDocument =
  HydratedDocument<NotificationPreferenceModel>;

@Schema({ collection: 'notification_preferences', versionKey: false })
export class NotificationPreferenceModel {
  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, default: null })
  teamId?: string;

  @Prop({ type: Boolean, required: true })
  notifyRequestStatus!: boolean;

  @Prop({ type: Boolean, required: true })
  notifyFeatureStatus!: boolean;

  @Prop({ type: Boolean, required: true })
  notifySprintStatus!: boolean;

  @Prop({ type: Boolean, required: true })
  notifyRelease!: boolean;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreferenceModel,
);

NotificationPreferenceSchema.index(
  { organizationId: 1, teamId: 1 },
  { unique: true },
);
