import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StatusMappingDocument = HydratedDocument<StatusMappingModel>;

@Schema({ _id: false })
class StatusMappingItem {
  @Prop({ type: String, required: true })
  linearStatus!: string;

  @Prop({ type: String, required: true })
  internalStatus!: string;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;
}

@Schema({ collection: 'status_mappings', versionKey: false })
export class StatusMappingModel {
  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: [StatusMappingItem], default: [] })
  items!: StatusMappingItem[];

  @Prop({ type: String, required: true })
  updatedAt!: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export const StatusMappingSchema =
  SchemaFactory.createForClass(StatusMappingModel);

StatusMappingSchema.index({ organizationId: 1, provider: 1 }, { unique: true });
