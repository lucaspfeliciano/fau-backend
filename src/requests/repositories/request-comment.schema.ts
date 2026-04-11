import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RequestCommentDocument = HydratedDocument<RequestCommentModel>;

@Schema({ collection: 'request_comments', versionKey: false })
export class RequestCommentModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  requestId!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  comment!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true, index: true })
  createdAt!: string;
}

export const RequestCommentSchema =
  SchemaFactory.createForClass(RequestCommentModel);

RequestCommentSchema.index({ organizationId: 1, requestId: 1, createdAt: 1 });
