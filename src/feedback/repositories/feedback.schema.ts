import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeedbackDocument = HydratedDocument<FeedbackModel>;

@Schema({ collection: 'feedback', versionKey: false })
export class FeedbackModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: String, required: true })
  source!: string;

  @Prop({ type: String })
  publicSubmitterName?: string;

  @Prop({ type: String })
  publicSubmitterEmail?: string;

  @Prop({ type: String, index: true })
  customerId?: string;

  @Prop({ type: Number, default: 0 })
  votes!: number;

  @Prop({ type: [String], default: [] })
  voterIds!: string[];

  @Prop({ type: String, index: true })
  status?: string;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        feedbackId: { type: String, required: true },
        text: { type: String, required: true },
        name: { type: String },
        createdAt: { type: String, required: true },
      },
    ],
    default: [],
  })
  comments!: {
    id: string;
    feedbackId: string;
    text: string;
    name?: string;
    createdAt: string;
  }[];

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(FeedbackModel);

FeedbackSchema.index({ workspaceId: 1, createdAt: -1 });
FeedbackSchema.index({ workspaceId: 1, source: 1, createdAt: -1 });
