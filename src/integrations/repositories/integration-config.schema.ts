import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IntegrationConfigDocument =
  HydratedDocument<IntegrationConfigModel>;

@Schema({ collection: 'integration_configs', versionKey: false })
export class IntegrationConfigModel {
  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  provider!: string;

  @Prop({ type: String })
  webhookUrl?: string;

  @Prop({ type: String })
  defaultChannel?: string;

  @Prop({ type: String })
  apiKey?: string;

  @Prop({ type: String })
  workspaceId?: string;

  @Prop({ type: String })
  projectId?: string;

  @Prop({ type: String })
  defaultLanguage?: string;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const IntegrationConfigSchema = SchemaFactory.createForClass(
  IntegrationConfigModel,
);

IntegrationConfigSchema.index(
  { organizationId: 1, provider: 1 },
  { unique: true },
);
