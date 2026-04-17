import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlaygroundInsightDocument =
  HydratedDocument<PlaygroundInsightModel>;

@Schema({ collection: 'playground_insights', versionKey: false })
export class PlaygroundInsightModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  playgroundWorkspaceId!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: false })
  summary?: string;

  @Prop({ type: String, required: true, index: true })
  type!: string;

  @Prop({ type: Number, required: true })
  importance!: number;

  @Prop({ type: Boolean, required: true, default: false })
  isPinned!: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  @Prop({ type: [String], default: [] })
  evidenceAssetIds!: string[];

  @Prop({ type: [String], default: [] })
  relatedHypothesisIds!: string[];

  @Prop({ type: [String], default: [] })
  requestIds!: string[];

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const PlaygroundInsightSchema = SchemaFactory.createForClass(
  PlaygroundInsightModel,
);

PlaygroundInsightSchema.index({
  workspaceId: 1,
  playgroundWorkspaceId: 1,
  isPinned: -1,
  sortOrder: 1,
  updatedAt: -1,
});

PlaygroundInsightSchema.index({
  workspaceId: 1,
  playgroundWorkspaceId: 1,
  type: 1,
  updatedAt: -1,
});
