import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({ _id: false })
class UserMembershipModel {
  @Prop({ type: String, required: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  role!: string;

  @Prop({ type: [String], default: [] })
  teamIds!: string[];

  @Prop({ type: String, required: true })
  joinedAt!: string;
}

@Schema({ collection: 'users', versionKey: false })
export class UserModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, unique: true })
  email!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, index: true, sparse: true })
  googleId?: string;

  @Prop({ type: String })
  passwordHash?: string;

  @Prop({ type: [UserMembershipModel], default: [] })
  memberships!: UserMembershipModel[];

  @Prop({ type: String })
  currentOrganizationId?: string;

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'memberships.organizationId': 1, 'memberships.teamIds': 1 });
