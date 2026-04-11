import { Role } from '../../common/auth/role.enum';
import { RoadmapItemCategory } from './roadmap-item.entity';

export enum RoadmapViewVisibility {
  Private = 'private',
  Role = 'role',
  Organization = 'organization',
}

export enum RoadmapSortBy {
  Score = 'score',
  Eta = 'eta',
  Status = 'status',
}

export enum RoadmapSortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export enum RoadmapGroupBy {
  Category = 'category',
  Status = 'status',
  Owner = 'owner',
}

export interface RoadmapViewFilters {
  [key: string]: unknown;
  search?: string;
  status?: string;
  ownerId?: string;
  boardId?: string;
  category?: RoadmapItemCategory;
  groupBy?: RoadmapGroupBy;
}

export interface RoadmapViewSort {
  sortBy: RoadmapSortBy;
  sortOrder: RoadmapSortOrder;
}

export interface RoadmapViewEntity {
  id: string;
  name: string;
  organizationId: string;
  ownerId: string;
  ownerRole: Role;
  visibility: RoadmapViewVisibility;
  filters: RoadmapViewFilters;
  sort: RoadmapViewSort;
  createdAt: string;
  updatedAt: string;
}
