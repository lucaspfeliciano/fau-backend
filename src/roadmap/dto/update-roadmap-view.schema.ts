import { z } from 'zod';
import { RoadmapItemCategory } from '../entities/roadmap-item.entity';
import {
  RoadmapGroupBy,
  RoadmapSortBy,
  RoadmapSortOrder,
  RoadmapViewVisibility,
} from '../entities/roadmap-view.entity';

const RoadmapViewFiltersSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  ownerId: z.string().trim().min(1).max(120).optional(),
  boardId: z.string().trim().min(1).max(120).optional(),
  category: z.nativeEnum(RoadmapItemCategory).optional(),
  groupBy: z.nativeEnum(RoadmapGroupBy).optional(),
});

const RoadmapViewSortSchema = z.object({
  sortBy: z.nativeEnum(RoadmapSortBy),
  sortOrder: z.nativeEnum(RoadmapSortOrder),
});

export const UpdateRoadmapViewSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    visibility: z.nativeEnum(RoadmapViewVisibility).optional(),
    filters: RoadmapViewFiltersSchema.optional(),
    sort: RoadmapViewSortSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateRoadmapViewInput = z.infer<typeof UpdateRoadmapViewSchema>;
