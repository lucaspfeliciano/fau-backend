import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntegrationCursorDocument =
  HydratedDocument<IntegrationCursorModel>;

@Schema({ collection: 'integration_cursors', versionKey: false })
export class IntegrationCursorModel {
  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: Number, required: true, default: 0 })
  cursor!: number;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const IntegrationCursorSchema = SchemaFactory.createForClass(
  IntegrationCursorModel,
);

IntegrationCursorSchema.index(
  { organizationId: 1, provider: 1 },
  { unique: true },
);
