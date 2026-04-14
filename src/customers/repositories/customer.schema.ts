import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<CustomerModel>;

@Schema({ collection: 'customers', versionKey: false })
export class CustomerModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String })
  companyId?: string;

  @Prop({ type: String, index: true })
  organizationId?: string;

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const CustomerSchema = SchemaFactory.createForClass(CustomerModel);

CustomerSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ workspaceId: 1, updatedAt: -1 });
CustomerSchema.index({ organizationId: 1, email: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ organizationId: 1, updatedAt: -1 });
