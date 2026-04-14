import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanningInitiativeDocument =
  HydratedDocument<PlanningInitiativeModel>;

@Schema({ collection: 'planning_initiatives', versionKey: false })
export class PlanningInitiativeModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  workspaceId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  requestIds!: string[];

  @Prop({ type: String, required: true, index: true })
  status!: string;

  @Prop({ type: String })
  priorityNotes?: string;
}

export const PlanningInitiativeSchema = SchemaFactory.createForClass(
  PlanningInitiativeModel,
);

PlanningInitiativeSchema.index({ workspaceId: 1, status: 1 });
PlanningInitiativeSchema.index({ workspaceId: 1, title: 1 });
