import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/auth/role.enum';
import {
  RoadmapSortBy,
  RoadmapSortOrder,
  RoadmapViewVisibility,
} from '../entities/roadmap-view.entity';

export type RoadmapViewDocument = HydratedDocument<RoadmapViewModel>;

@Schema({ collection: 'roadmap_views', versionKey: false })
export class RoadmapViewModel {
  @Prop({ type: String, required: true, unique: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, index: true })
  organizationId!: string;

  @Prop({ type: String, required: true, index: true })
  ownerId!: string;

  @Prop({ type: String, required: true, enum: Object.values(Role) })
  ownerRole!: Role;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(RoadmapViewVisibility),
    index: true,
  })
  visibility!: RoadmapViewVisibility;

  @Prop({ type: Object, required: true })
  filters!: Record<string, unknown>;

  @Prop({
    type: {
      sortBy: {
        type: String,
        enum: Object.values(RoadmapSortBy),
        required: true,
      },
      sortOrder: {
        type: String,
        enum: Object.values(RoadmapSortOrder),
        required: true,
      },
    },
    required: true,
  })
  sort!: {
    sortBy: RoadmapSortBy;
    sortOrder: RoadmapSortOrder;
  };

  @Prop({ type: String, required: true })
  createdAt!: string;

  @Prop({ type: String, required: true, index: true })
  updatedAt!: string;
}

export const RoadmapViewSchema = SchemaFactory.createForClass(RoadmapViewModel);

RoadmapViewSchema.index({ organizationId: 1, ownerId: 1, updatedAt: -1 });
RoadmapViewSchema.index({ organizationId: 1, ownerRole: 1, updatedAt: -1 });
RoadmapViewSchema.index({ organizationId: 1, visibility: 1, updatedAt: -1 });
