import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanningSprintDocument = HydratedDocument<PlanningSprintModel>;

@Schema({ collection: 'planning_sprints', versionKey: false })
export class PlanningSprintModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true, index: true })
  initiativeId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, index: true })
  status!: string;

  @Prop({ type: String })
  eta?: string;

  @Prop({ type: String, index: true })
  squad?: string;

  @Prop({ type: String, index: true })
  externalLinearSprintId?: string;
}

export const PlanningSprintSchema =
  SchemaFactory.createForClass(PlanningSprintModel);

PlanningSprintSchema.index({ workspaceId: 1, initiativeId: 1, status: 1 });
