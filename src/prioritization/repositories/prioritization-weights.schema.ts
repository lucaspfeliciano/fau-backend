import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PrioritizationWeightsDocument =
  HydratedDocument<PrioritizationWeightsModel>;

@Schema({ collection: 'prioritization_weights', versionKey: false })
export class PrioritizationWeightsModel {
  @Prop({ type: String, required: true, unique: true })
  organizationId!: string;

  @Prop({ type: Number, required: true })
  wVotes!: number;

  @Prop({ type: Number, required: true })
  wRevenue!: number;

  @Prop({ type: Number, required: true })
  wTier!: number;

  @Prop({ type: Number, required: true })
  wChurn!: number;

  @Prop({ type: Number, required: true })
  wStrategicTag!: number;

  @Prop({ type: [String], default: [] })
  strategicTags!: string[];

  @Prop({ type: [String], default: [] })
  churnRiskTags!: string[];

  @Prop({ type: String, required: true })
  updatedAt!: string;
}

export const PrioritizationWeightsSchema = SchemaFactory.createForClass(
  PrioritizationWeightsModel,
);
