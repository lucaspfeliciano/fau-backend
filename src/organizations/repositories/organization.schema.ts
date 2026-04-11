import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<OrganizationModel>;

@Schema({ collection: 'organizations', versionKey: false })
export class OrganizationModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const OrganizationSchema =
  SchemaFactory.createForClass(OrganizationModel);
