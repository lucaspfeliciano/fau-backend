import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BoardDocument = HydratedDocument<BoardModel>;

@Schema({ collection: 'boards', versionKey: false })
export class BoardModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const BoardSchema = SchemaFactory.createForClass(BoardModel);

BoardSchema.index({ organizationId: 1, name: 1 }, { unique: true });
BoardSchema.index({ organizationId: 1, updatedAt: -1 });
