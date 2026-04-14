import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlaygroundAssetDocument = HydratedDocument<PlaygroundAssetModel>;

@Schema({ collection: 'playground_assets', versionKey: false })
export class PlaygroundAssetModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  playgroundWorkspaceId!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, index: true })
  type!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: String })
  fileUrl?: string;

  @Prop({ type: String, required: true })
  storageKey!: string;

  @Prop({ type: String })
  extractedText?: string;

  @Prop({ type: String, required: true })
  uploadedBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;
}

export const PlaygroundAssetSchema = SchemaFactory.createForClass(
  PlaygroundAssetModel,
);

PlaygroundAssetSchema.index({
  workspaceId: 1,
  playgroundWorkspaceId: 1,
  createdAt: -1,
});
PlaygroundAssetSchema.index({ workspaceId: 1, type: 1, createdAt: -1 });
