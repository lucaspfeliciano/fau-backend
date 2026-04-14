import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlaygroundWorkspaceDocument =
  HydratedDocument<PlaygroundWorkspaceModel>;

@Schema({ collection: 'playground_workspaces', versionKey: false })
export class PlaygroundWorkspaceModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const PlaygroundWorkspaceSchema = SchemaFactory.createForClass(
  PlaygroundWorkspaceModel,
);

PlaygroundWorkspaceSchema.index({ workspaceId: 1, updatedAt: -1 });
PlaygroundWorkspaceSchema.index({ workspaceId: 1, title: 1 });
