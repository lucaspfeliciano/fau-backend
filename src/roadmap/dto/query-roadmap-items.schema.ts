import { z } from 'zod';
import {
  RoadmapAudience,
  RoadmapEtaConfidence,
  RoadmapItemCategory,
} from '../entities/roadmap-item.entity';
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
  owner: z.string().trim().min(1).max(120).optional(),
  board: z.string().trim().min(1).max(120).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  audience: z.nativeEnum(RoadmapAudience).default(RoadmapAudience.All),
  etaConfidence: z.nativeEnum(RoadmapEtaConfidence).optional(),
  ownerId: z.string().trim().min(1).max(120).optional(),
  boardId: z.string().trim().min(1).max(120).optional(),
  category: z.nativeEnum(RoadmapItemCategory).optional(),
  sortBy: z
    .union([
      z.literal(RoadmapSortBy.Score),
      z.literal(RoadmapSortBy.Eta),
      z.literal(RoadmapSortBy.Impact),
    ])
    .default(RoadmapSortBy.Score),
  sortOrder: z.nativeEnum(RoadmapSortOrder).default(RoadmapSortOrder.Desc),
  groupBy: z
    .union([
      z.literal(RoadmapGroupBy.None),
      z.literal(RoadmapGroupBy.Status),
      z.literal(RoadmapGroupBy.Owner),
      z.literal(RoadmapGroupBy.Board),
      z.literal(RoadmapGroupBy.EtaConfidence),
      z.literal(RoadmapGroupBy.Category),
    ])
    .default(RoadmapGroupBy.None),
});

export type QueryRoadmapItemsInput = z.infer<typeof QueryRoadmapItemsSchema>;
