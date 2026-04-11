import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyDocument = HydratedDocument<CompanyModel>;

@Schema({ collection: 'companies', versionKey: false })
export class CompanyModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Number })
  revenue?: number;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const CompanySchema = SchemaFactory.createForClass(CompanyModel);

CompanySchema.index({ organizationId: 1, updatedAt: -1 });
