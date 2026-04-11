import { z } from 'zod';
import { RoadmapItemCategory } from '../entities/roadmap-item.entity';
import {
  RoadmapGroupBy,
  RoadmapSortBy,
  RoadmapSortOrder,
} from '../entities/roadmap-view.entity';

const toPositiveInt = (defaultValue: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    max ? z.number().int().min(1).max(max) : z.number().int().min(1),
  );

export const QueryRoadmapItemsSchema = z.object({
  page: toPositiveInt(1),
  pageSize: toPositiveInt(20, 100),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  ownerId: z.string().trim().min(1).max(120).optional(),
  boardId: z.string().trim().min(1).max(120).optional(),
  category: z.nativeEnum(RoadmapItemCategory).optional(),
  sortBy: z.nativeEnum(RoadmapSortBy).default(RoadmapSortBy.Score),
  sortOrder: z.nativeEnum(RoadmapSortOrder).default(RoadmapSortOrder.Desc),
  groupBy: z.nativeEnum(RoadmapGroupBy).optional(),
});

export type QueryRoadmapItemsInput = z.infer<typeof QueryRoadmapItemsSchema>;
