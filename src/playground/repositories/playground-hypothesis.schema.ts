import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlaygroundHypothesisDocument =
  HydratedDocument<PlaygroundHypothesisModel>;

@Schema({ collection: 'playground_hypotheses', versionKey: false })
export class PlaygroundHypothesisModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  playgroundWorkspaceId!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  statement!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, index: true })
  status!: string;

  @Prop({ type: Number, required: true })
  confidence!: number;

  @Prop({ type: [String], default: [] })
  evidenceAssetIds!: string[];

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const PlaygroundHypothesisSchema = SchemaFactory.createForClass(
  PlaygroundHypothesisModel,
);

PlaygroundHypothesisSchema.index({
  workspaceId: 1,
  playgroundWorkspaceId: 1,
  updatedAt: -1,
});
PlaygroundHypothesisSchema.index({
  workspaceId: 1,
  playgroundWorkspaceId: 1,
  status: 1,
  updatedAt: -1,
});
