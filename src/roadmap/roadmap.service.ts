import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { SprintEntity } from '../engineering/entities/sprint.entity';
import type { TaskEntity } from '../engineering/entities/task.entity';
import { EngineeringService } from '../engineering/engineering.service';
import type { ReleaseEntity } from '../notifications/entities/release.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { FeatureEntity } from '../product/entities/feature.entity';
import { ProductService } from '../product/product.service';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestsService } from '../requests/requests.service';
import type { CreateRoadmapViewInput } from './dto/create-roadmap-view.schema';
import type { QueryRoadmapItemsInput } from './dto/query-roadmap-items.schema';
import type { QueryRoadmapViewsInput } from './dto/query-roadmap-views.schema';
import type { UpdateRoadmapViewInput } from './dto/update-roadmap-view.schema';
import {
  RoadmapItemCategory,
  type RoadmapItemEntity,
} from './entities/roadmap-item.entity';
import {
  RoadmapGroupBy,
  RoadmapSortBy,
  RoadmapSortOrder,
  type RoadmapViewEntity,
  type RoadmapViewFilters,
  type RoadmapViewSort,
  RoadmapViewVisibility,
} from './entities/roadmap-view.entity';
import { RoadmapViewsRepository } from './repositories/roadmap-views.repository';

export interface RoadmapGroupCount {
  key: string;
  count: number;
}

export interface PaginatedRoadmapItemsResult {
  items: RoadmapItemEntity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  groups?: RoadmapGroupCount[];
}

export interface PaginatedRoadmapViewsResult {
  items: RoadmapViewEntity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class RoadmapService {
  private static readonly AGGREGATION_PAGE_LIMIT = 100;

  constructor(
    private readonly requestsService: RequestsService,
    private readonly productService: ProductService,
    private readonly engineeringService: EngineeringService,
    private readonly notificationsService: NotificationsService,
    private readonly roadmapViewsRepository: RoadmapViewsRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async listItems(
    query: QueryRoadmapItemsInput,
    organizationId: string,
  ): Promise<PaginatedRoadmapItemsResult> {
    const [requests, features, tasks, sprints, releases] = await Promise.all([
      this.collectAllRequests(organizationId),
      this.collectAllFeatures(organizationId),
      this.collectAllTasks(organizationId),
      this.collectAllSprints(organizationId),
      this.notificationsService.listReleases(organizationId),
    ]);

    const sprintById = new Map<string, SprintEntity>(
      sprints.map((sprint) => [sprint.id, sprint]),
    );

    const allItems: RoadmapItemEntity[] = [
      ...this.mapRequestItems(requests),
      ...this.mapFeatureItems(features),
      ...this.mapTaskItems(tasks, sprintById),
      ...this.mapReleaseItems(releases),
    ];

    const filtered = allItems
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
        );
      })
      .filter((item) => {
        if (!query.status) {
          return true;
        }

        return item.status.toLowerCase() === query.status.toLowerCase();
      })
      .filter((item) => {
        if (!query.ownerId) {
          return true;
        }

        return item.ownerId === query.ownerId;
      })
      .filter((item) => {
        if (!query.boardId) {
          return true;
        }

        return item.boardId === query.boardId;
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }

        return item.category === query.category;
      });

    const sorted = this.sortItems(filtered, query.sortBy, query.sortOrder);
    const page = query.page;
    const pageSize = query.pageSize;
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    return {
      items: sorted.slice(offset, offset + pageSize),
      page,
      pageSize,
      total,
      totalPages,
      groups: query.groupBy
        ? this.calculateGroupCounts(sorted, query.groupBy)
        : undefined,
    };
  }

  async listViews(
    query: QueryRoadmapViewsInput,
    user: AuthenticatedUser,
  ): Promise<PaginatedRoadmapViewsResult> {
    const visibleViews = (
      await this.roadmapViewsRepository.listByOrganization(user.organizationId)
    )
      .filter((view) => this.canReadView(view, user))
      .filter((view) => {
        if (!query.visibility) {
          return true;
        }

        return view.visibility === query.visibility;
      })
      .filter((view) => {
        if (!query.search) {
          return true;
        }

        return view.name.toLowerCase().includes(query.search.toLowerCase());
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page;
    const pageSize = query.pageSize;
    const total = visibleViews.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    return {
      items: visibleViews.slice(offset, offset + pageSize),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  async createView(
    input: CreateRoadmapViewInput,
    actor: AuthenticatedUser,
  ): Promise<RoadmapViewEntity> {
    this.ensureVisibilityPermission(input.visibility, actor.role);

    const now = new Date().toISOString();
    const view: RoadmapViewEntity = {
      id: randomUUID(),
      name: input.name,
      organizationId: actor.organizationId,
      ownerId: actor.id,
      ownerRole: actor.role,
      visibility: input.visibility,
      filters: this.normalizeFilters(input.filters),
      sort: this.normalizeSort(input.sort),
      createdAt: now,
      updatedAt: now,
    };

    await this.roadmapViewsRepository.insert(view);

    this.domainEventsService.publish({
      name: 'roadmap.view_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        roadmapViewId: view.id,
        visibility: view.visibility,
      },
    });

    return view;
  }

  async updateView(
    id: string,
    input: UpdateRoadmapViewInput,
    actor: AuthenticatedUser,
  ): Promise<RoadmapViewEntity> {
    const view = await this.findViewById(id, actor.organizationId);
    this.ensureCanMutateView(view, actor);

    if (input.visibility !== undefined) {
      this.ensureVisibilityPermission(input.visibility, actor.role);
      view.visibility = input.visibility;
    }

    if (input.name !== undefined) {
      view.name = input.name;
    }

    if (input.filters !== undefined) {
      view.filters = this.normalizeFilters(input.filters);
    }

    if (input.sort !== undefined) {
      view.sort = this.normalizeSort(input.sort);
    }

    view.updatedAt = new Date().toISOString();
    await this.roadmapViewsRepository.update(view);

    this.domainEventsService.publish({
      name: 'roadmap.view_updated',
      occurredAt: view.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        roadmapViewId: view.id,
      },
    });

    return view;
  }

  async deleteView(id: string, actor: AuthenticatedUser): Promise<void> {
    const view = await this.findViewById(id, actor.organizationId);
    this.ensureCanMutateView(view, actor);

    await this.roadmapViewsRepository.deleteById(view.id, view.organizationId);

    this.domainEventsService.publish({
      name: 'roadmap.view_deleted',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        roadmapViewId: view.id,
      },
    });
  }

  private mapRequestItems(requests: RequestEntity[]): RoadmapItemEntity[] {
    return requests.map((request) => ({
      id: `request:${request.id}`,
      sourceId: request.id,
      category: RoadmapItemCategory.Request,
      title: request.title,
      description: request.description,
      status: request.status,
      ownerId: request.createdBy,
      boardId: request.boardId,
      score: request.votes,
      eta: undefined,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));
  }

  private mapFeatureItems(features: FeatureEntity[]): RoadmapItemEntity[] {
    return features.map((feature) => ({
      id: `feature:${feature.id}`,
      sourceId: feature.id,
      category: RoadmapItemCategory.Feature,
      title: feature.title,
      description: feature.description,
      status: feature.status,
      ownerId: feature.createdBy,
      boardId: undefined,
      score: feature.priorityScore,
      eta: undefined,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    }));
  }

  private mapTaskItems(
    tasks: TaskEntity[],
    sprintById: Map<string, SprintEntity>,
  ): RoadmapItemEntity[] {
    return tasks.map((task) => ({
      id: `task:${task.id}`,
      sourceId: task.id,
      category: RoadmapItemCategory.Task,
      title: task.title,
      description: task.description,
      status: task.status,
      ownerId: task.createdBy,
      boardId: undefined,
      score: task.estimate,
      eta: task.sprintId ? sprintById.get(task.sprintId)?.endDate : undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  private mapReleaseItems(releases: ReleaseEntity[]): RoadmapItemEntity[] {
    return releases.map((release) => ({
      id: `release:${release.id}`,
      sourceId: release.id,
      category: RoadmapItemCategory.Release,
      title: release.title,
      description: release.notes,
      status: 'Published',
      ownerId: release.createdBy,
      boardId: undefined,
      score: release.featureIds.length + release.sprintIds.length,
      eta: undefined,
      createdAt: release.createdAt,
      updatedAt: release.createdAt,
    }));
  }

  private sortItems(
    items: RoadmapItemEntity[],
    sortBy: RoadmapSortBy,
    sortOrder: RoadmapSortOrder,
  ): RoadmapItemEntity[] {
    const direction = sortOrder === RoadmapSortOrder.Asc ? 1 : -1;

    return [...items].sort((a, b) => {
      const primary = this.compareBySort(a, b, sortBy);

      if (primary !== 0) {
        return primary * direction;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  private compareBySort(
    a: RoadmapItemEntity,
    b: RoadmapItemEntity,
    sortBy: RoadmapSortBy,
  ): number {
    if (sortBy === RoadmapSortBy.Score) {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      return scoreA - scoreB;
    }

    if (sortBy === RoadmapSortBy.Status) {
      return a.status.localeCompare(b.status);
    }

    const etaA = a.eta ? Date.parse(a.eta) : undefined;
    const etaB = b.eta ? Date.parse(b.eta) : undefined;

    if (etaA === undefined && etaB === undefined) {
      return 0;
    }

    if (etaA === undefined) {
      return 1;
    }

    if (etaB === undefined) {
      return -1;
    }

    return etaA - etaB;
  }

  private async collectAllRequests(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.requestsService.list(
        {
          page,
          limit,
          includeArchived: false,
        },
        organizationId,
      ),
    );
  }

  private async collectAllFeatures(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.productService.listFeatures(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllTasks(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.engineeringService.listTasks(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllSprints(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.engineeringService.listSprints(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllPages<T>(
    fetchPage: (
      page: number,
      limit: number,
    ) => Promise<{ items: T[]; totalPages: number }>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await fetchPage(
        
       ,
      
        page,
        RoadmapService.AGGREGATION_PAGE_LIMIT,
      );
      items.push(...result.items);

      totalPages = result.totalPages;
      if (totalPages === 0) {
        break;
      }

      page += 1;
    }

    return items;
  }

  private calculateGroupCounts(
    items: RoadmapItemEntity[],
    groupBy: RoadmapGroupBy,
  ): RoadmapGroupCount[] {
    const counts = new Map<string, number>();

    for (const item of items) {
      const key =
        groupBy === RoadmapGroupBy.Category
          ? item.category
          : groupBy === RoadmapGroupBy.Status
            ? item.status
            : item.ownerId;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }

  private canReadView(
    view: RoadmapViewEntity,
    user: AuthenticatedUser,
  ): boolean {
    if (view.visibility === RoadmapViewVisibility.Organization) {
      return true;
    }

    if (view.visibility === RoadmapViewVisibility.Private) {
      return view.ownerId === user.id || user.role === Role.Admin;
    }

    return view.ownerRole === user.role || user.role === Role.Admin;
  }

  private ensureCanMutateView(
    view: RoadmapViewEntity,
    actor: AuthenticatedUser,
  ): void {
    if (view.ownerId === actor.id || actor.role === Role.Admin) {
      return;
    }

    throw new ForbiddenException(
      'Only the owner or an admin can modify this roadmap view.',
    );
  }

  private ensureVisibilityPermission(
    visibility: RoadmapViewVisibility,
    role: Role,
  ): void {
    if (visibility === RoadmapViewVisibility.Private) {
      return;
    }

    if (role === Role.Admin || role === Role.Editor) {
      return;
    }

    throw new ForbiddenException(
      'Only Admin or Editor can use role or organization visibility.',
    );
  }

  private normalizeFilters(filters?: RoadmapViewFilters): RoadmapViewFilters {
    if (!filters) {
      return {};
    }

    return {
      search: filters.search,
      status: filters.status,
      ownerId: filters.ownerId,
      boardId: filters.boardId,
      category: filters.category,
      groupBy: filters.groupBy,
    };
  }

  private normalizeSort(sort?: Partial<RoadmapViewSort>): RoadmapViewSort {
    return {
      sortBy: sort?.sortBy ?? RoadmapSortBy.Score,
      sortOrder: sort?.sortOrder ?? RoadmapSortOrder.Desc,
    };
  }

  private async findViewById(
    id: string,
    organizationId: string,
  ): Promise<RoadmapViewEntity> {
    const view = await this.roadmapViewsRepository.findById(id, organizationId);

    if (!view) {
      throw new NotFoundException('Roadmap view not found.');
    }

    return view;
  }
}
