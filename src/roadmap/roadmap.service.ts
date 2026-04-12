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
import { TaskStatus } from '../engineering/entities/task-status.enum';
import { EngineeringService } from '../engineering/engineering.service';
import type { ReleaseEntity } from '../notifications/entities/release.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { FeatureEntity } from '../product/entities/feature.entity';
import { ProductPriority } from '../product/entities/product-priority.enum';
import { ProductService } from '../product/product.service';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestsService } from '../requests/requests.service';
import type { CreateRoadmapViewInput } from './dto/create-roadmap-view.schema';
import type { QueryRoadmapItemsInput } from './dto/query-roadmap-items.schema';
import type { QueryRoadmapViewsInput } from './dto/query-roadmap-views.schema';
import type { UpdateRoadmapViewInput } from './dto/update-roadmap-view.schema';
import {
  RoadmapAudience,
  RoadmapEtaConfidence,
  type RoadmapImpact,
  RoadmapItemCategory,
  type RoadmapItemEntity,
  type RoadmapRiskLevel,
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

    const requestsById = new Map<string, RequestEntity>(
      requests.map((request) => [request.id, request]),
    );

    const sprintById = new Map<string, SprintEntity>(
      sprints.map((sprint) => [sprint.id, sprint]),
    );

    const tasksByFeatureId = this.groupTasksByFeature(tasks);
    const releaseByFeatureId = this.mapReleaseByFeature(releases);
    const releaseBySprintId = this.mapReleaseBySprint(releases);

    const audience = query.audience ?? RoadmapAudience.All;
    const etaConfidence = query.etaConfidence;
    const sortBy = query.sortBy ?? RoadmapSortBy.Score;
    const sortOrder = query.sortOrder ?? RoadmapSortOrder.Desc;
    const groupBy = query.groupBy ?? RoadmapGroupBy.None;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const allItems: RoadmapItemEntity[] = [
      ...this.mapRequestItems(requests),
      ...this.mapFeatureItems(
        features,
        tasksByFeatureId,
        releaseByFeatureId,
        sprintById,
      ),
      ...this.mapTaskItems(
        tasks,
        sprintById,
        releaseByFeatureId,
        releaseBySprintId,
        requestsById,
      ),
      ...this.mapReleaseItems(releases, requestsById, features, tasks),
    ];

    const normalizedOwner = query.owner ?? query.ownerId;
    const normalizedBoard = query.board ?? query.boardId;

    const filtered = allItems
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();

        return (
          item.title.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          item.board.toLowerCase().includes(search) ||
          item.owner.toLowerCase().includes(search) ||
          item.post.toLowerCase().includes(search) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search))
        );
      })
      .filter((item) => {
        if (!query.status) {
          return true;
        }

        return item.status.toLowerCase() === query.status.toLowerCase();
      })
      .filter((item) => {
        if (!normalizedOwner) {
          return true;
        }

        return item.owner === normalizedOwner;
      })
      .filter((item) => {
        if (!normalizedBoard) {
          return true;
        }

        return item.board === normalizedBoard;
      })
      .filter((item) => {
        if (!query.tag) {
          return true;
        }

        const targetTag = query.tag.toLowerCase();
        return item.tags.some((tag) => tag.toLowerCase() === targetTag);
      })
      .filter((item) => {
        if (!etaConfidence) {
          return true;
        }

        return item.eta.confidence === etaConfidence;
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }

        return item.category === query.category;
      })
      .filter((item) => this.matchesAudience(item, audience));

    const sorted = this.sortItems(filtered, sortBy, sortOrder, groupBy);
    const total = sorted.length;
    const offset = (page - 1) * pageSize;

    return {
      items: sorted.slice(offset, offset + pageSize),
      page,
      pageSize,
      total,
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
      id: `roadmap-request-${request.id}`,
      requestId: request.id,
      category: RoadmapItemCategory.Request,
      title: request.title,
      post: request.description,
      board: request.boardId ?? 'unassigned',
      owner: request.createdBy,
      status: request.status,
      tags: request.tags,
      score: Math.min(100, request.votes * 8),
      scoreBreakdown: {
        votes: request.votes,
        revenue: request.companyIds.length * 8,
        churn: request.customerIds.length * 4,
        strategic: request.tags.some((tag) => tag.toLowerCase() === 'strategic')
          ? 12
          : 0,
        total: Math.min(
          100,
          request.votes * 8 +
            request.companyIds.length * 8 +
            request.customerIds.length * 4 +
            (request.tags.some((tag) => tag.toLowerCase() === 'strategic')
              ? 12
              : 0),
        ),
        formula: '(votes*8)+(companies*8)+(customers*4)+strategicBonus',
      },
      eta: {
        date: undefined,
        confidence: RoadmapEtaConfidence.Low,
        source: 'request',
      },
      impact: {
        customers: request.customerIds.length,
        strategicAccounts: request.companyIds.length,
        revenueAtRisk: request.companyIds.length * 10000,
      },
      riskLevel: this.deriveRiskLevel({
        customers: request.customerIds.length,
        strategicAccounts: request.companyIds.length,
        revenueAtRisk: request.companyIds.length * 10000,
      }),
      traceability: {
        requestId: request.id,
        taskIds: [],
      },
      updatedAt: request.updatedAt,
    }));
  }

  private mapFeatureItems(
    features: FeatureEntity[],
    tasksByFeatureId: Map<string, TaskEntity[]>,
    releaseByFeatureId: Map<string, ReleaseEntity>,
    sprintById: Map<string, SprintEntity>,
  ): RoadmapItemEntity[] {
    return features.map((feature) => ({
      id: `roadmap-feature-${feature.id}`,
      requestId: feature.requestIds[0] ?? feature.id,
      category: RoadmapItemCategory.Feature,
      title: feature.title,
      post: feature.description,
      board: 'product',
      owner: feature.createdBy,
      status: feature.status,
      tags: [feature.priority.toLowerCase(), feature.status.toLowerCase()],
      score: Math.max(0, Math.min(100, feature.priorityScore)),
      scoreBreakdown: {
        votes: feature.requestIds.length * 5,
        revenue: feature.requestSources.length * 10,
        churn: feature.requestSources.length * 4,
        strategic: feature.priority === ProductPriority.Critical ? 15 : 0,
        total: Math.max(0, Math.min(100, feature.priorityScore)),
        formula: 'feature.priorityScore',
      },
      eta: {
        date: tasksByFeatureId
          .get(feature.id)
          ?.map((task) => task.sprintId)
          .filter((sprintId): sprintId is string => Boolean(sprintId))
          .map((sprintId) => sprintById.get(sprintId)?.endDate)
          .filter((endDate): endDate is string => Boolean(endDate))
          .sort()
          .at(0),
        confidence: this.deriveEtaConfidence(feature.priorityScore),
        source: 'feature',
      },
      impact: {
        customers: feature.requestIds.length,
        strategicAccounts: feature.requestSources.length,
        revenueAtRisk: feature.priorityScore * 1000,
      },
      riskLevel: this.deriveRiskLevel({
        customers: feature.requestIds.length,
        strategicAccounts: feature.requestSources.length,
        revenueAtRisk: feature.priorityScore * 1000,
      }),
      traceability: {
        requestId: feature.requestIds[0],
        featureId: feature.id,
        taskIds: tasksByFeatureId.get(feature.id)?.map((task) => task.id) ?? [],
        sprintId: tasksByFeatureId
          .get(feature.id)
          ?.map((task) => task.sprintId)
          .find((sprintId): sprintId is string => Boolean(sprintId)),
        releaseId: releaseByFeatureId.get(feature.id)?.id,
      },
      updatedAt: feature.updatedAt,
    }));
  }

  private mapTaskItems(
    tasks: TaskEntity[],
    sprintById: Map<string, SprintEntity>,
    releaseByFeatureId: Map<string, ReleaseEntity>,
    releaseBySprintId: Map<string, ReleaseEntity>,
    requestsById: Map<string, RequestEntity>,
  ): RoadmapItemEntity[] {
    return tasks.map((task) => ({
      id: `roadmap-task-${task.id}`,
      requestId: task.requestSources[0]?.requestId ?? task.featureId,
      category: RoadmapItemCategory.Task,
      title: task.title,
      post: task.description,
      board:
        requestsById.get(task.requestSources[0]?.requestId ?? '')?.boardId ??
        'engineering',
      owner: task.createdBy,
      status: task.status,
      tags: [task.status.toLowerCase()],
      score: Math.max(0, Math.min(100, (task.estimate ?? 0) * 5)),
      scoreBreakdown: {
        votes: task.requestSources.length * 5,
        revenue: (task.estimate ?? 0) * 3,
        churn: task.status === TaskStatus.Blocked ? 10 : 3,
        strategic: task.status === TaskStatus.Blocked ? 8 : 0,
        total: Math.max(0, Math.min(100, (task.estimate ?? 0) * 5)),
        formula: '(estimate*5) bounded [0,100]',
      },
      eta: {
        date: task.sprintId
          ? sprintById.get(task.sprintId)?.endDate
          : undefined,
        confidence: task.sprintId
          ? RoadmapEtaConfidence.Medium
          : RoadmapEtaConfidence.Low,
        source: task.sprintId ? 'sprint' : 'task',
      },
      impact: {
        customers: task.requestSources.length,
        strategicAccounts: task.requestSources.length,
        revenueAtRisk: (task.estimate ?? 0) * 1200,
      },
      riskLevel: this.deriveRiskLevel({
        customers: task.requestSources.length,
        strategicAccounts: task.requestSources.length,
        revenueAtRisk: (task.estimate ?? 0) * 1200,
      }),
      traceability: {
        requestId: task.requestSources[0]?.requestId,
        featureId: task.featureId,
        taskIds: [task.id],
        sprintId: task.sprintId,
        releaseId:
          releaseByFeatureId.get(task.featureId)?.id ??
          (task.sprintId
            ? releaseBySprintId.get(task.sprintId)?.id
            : undefined),
      },
      updatedAt: task.updatedAt,
    }));
  }

  private mapReleaseItems(
    releases: ReleaseEntity[],
    requestsById: Map<string, RequestEntity>,
    features: FeatureEntity[],
    tasks: TaskEntity[],
  ): RoadmapItemEntity[] {
    const requestIdByFeatureId = new Map<string, string>();
    for (const feature of features) {
      if (feature.requestIds[0]) {
        requestIdByFeatureId.set(feature.id, feature.requestIds[0]);
      }
    }

    const taskIdsByFeatureId = new Map<string, string[]>();
    for (const task of tasks) {
      const existing = taskIdsByFeatureId.get(task.featureId) ?? [];
      existing.push(task.id);
      taskIdsByFeatureId.set(task.featureId, existing);
    }

    return releases.map((release) => ({
      id: `roadmap-release-${release.id}`,
      requestId:
        requestIdByFeatureId.get(release.featureIds[0] ?? '') ?? release.id,
      category: RoadmapItemCategory.Release,
      title: release.title,
      post: release.notes,
      board:
        requestsById.get(
          requestIdByFeatureId.get(release.featureIds[0] ?? '') ?? '',
        )?.boardId ?? 'releases',
      owner: release.createdBy,
      status: release.status,
      tags: ['release', release.status],
      score: Math.max(
        0,
        Math.min(
          100,
          release.featureIds.length * 12 + release.sprintIds.length * 10,
        ),
      ),
      scoreBreakdown: {
        votes: release.featureIds.length * 8,
        revenue: release.featureIds.length * 10,
        churn: release.sprintIds.length * 6,
        strategic: release.status === 'published' ? 12 : 4,
        total: Math.max(
          0,
          Math.min(
            100,
            release.featureIds.length * 12 + release.sprintIds.length * 10,
          ),
        ),
        formula: '(featureCount*12)+(sprintCount*10)',
      },
      eta: {
        date: release.scheduledAt,
        confidence: release.scheduledAt
          ? RoadmapEtaConfidence.High
          : RoadmapEtaConfidence.Medium,
        source: 'release',
      },
      impact: {
        customers: release.featureIds.length,
        strategicAccounts: release.featureIds.length,
        revenueAtRisk: release.featureIds.length * 20000,
      },
      riskLevel: this.deriveRiskLevel({
        customers: release.featureIds.length,
        strategicAccounts: release.featureIds.length,
        revenueAtRisk: release.featureIds.length * 20000,
      }),
      traceability: {
        requestId: requestIdByFeatureId.get(release.featureIds[0] ?? ''),
        featureId: release.featureIds[0],
        taskIds:
          release.featureIds.flatMap(
            (featureId) => taskIdsByFeatureId.get(featureId) ?? [],
          ) ?? [],
        sprintId: release.sprintIds[0],
        releaseId: release.id,
      },
      updatedAt: release.updatedAt,
    }));
  }

  private sortItems(
    items: RoadmapItemEntity[],
    sortBy: RoadmapSortBy,
    sortOrder: RoadmapSortOrder,
    groupBy: RoadmapGroupBy,
  ): RoadmapItemEntity[] {
    const direction = sortOrder === RoadmapSortOrder.Asc ? 1 : -1;

    return [...items].sort((a, b) => {
      if (groupBy !== RoadmapGroupBy.None) {
        const groupA = this.resolveGroupKey(a, groupBy);
        const groupB = this.resolveGroupKey(b, groupBy);
        const grouped = groupA.localeCompare(groupB);

        if (grouped !== 0) {
          return grouped;
        }
      }

      const primary = this.compareBySort(a, b, sortBy);

      if (primary !== 0) {
        return primary * direction;
      }

      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  private resolveGroupKey(
    item: RoadmapItemEntity,
    groupBy: RoadmapGroupBy,
  ): string {
    if (groupBy === RoadmapGroupBy.Category) {
      return item.category;
    }

    if (groupBy === RoadmapGroupBy.Status) {
      return item.status;
    }

    if (groupBy === RoadmapGroupBy.Board) {
      return item.board;
    }

    if (groupBy === RoadmapGroupBy.EtaConfidence) {
      return item.eta.confidence;
    }

    return item.owner;
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

    if (sortBy === RoadmapSortBy.Impact) {
      const impactA = this.impactValue(a.impact);
      const impactB = this.impactValue(b.impact);
      return impactA - impactB;
    }

    const etaA = a.eta.date ? Date.parse(a.eta.date) : undefined;
    const etaB = b.eta.date ? Date.parse(b.eta.date) : undefined;

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
    if (groupBy === RoadmapGroupBy.None) {
      return [];
    }

    const counts = new Map<string, number>();

    for (const item of items) {
      const key =
        groupBy === RoadmapGroupBy.Category
          ? item.category
          : groupBy === RoadmapGroupBy.Status
            ? item.status
            : groupBy === RoadmapGroupBy.Board
              ? item.board
              : groupBy === RoadmapGroupBy.EtaConfidence
                ? item.eta.confidence
                : item.owner;

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
      owner: filters.owner,
      board: filters.board,
      tag: filters.tag,
      audience: filters.audience,
      etaConfidence: filters.etaConfidence,
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

  private groupTasksByFeature(tasks: TaskEntity[]): Map<string, TaskEntity[]> {
    const map = new Map<string, TaskEntity[]>();

    for (const task of tasks) {
      const current = map.get(task.featureId) ?? [];
      current.push(task);
      map.set(task.featureId, current);
    }

    return map;
  }

  private mapReleaseByFeature(
    releases: ReleaseEntity[],
  ): Map<string, ReleaseEntity> {
    const map = new Map<string, ReleaseEntity>();

    for (const release of releases) {
      for (const featureId of release.featureIds) {
        if (!map.has(featureId)) {
          map.set(featureId, release);
        }
      }
    }

    return map;
  }

  private mapReleaseBySprint(
    releases: ReleaseEntity[],
  ): Map<string, ReleaseEntity> {
    const map = new Map<string, ReleaseEntity>();

    for (const release of releases) {
      for (const sprintId of release.sprintIds) {
        if (!map.has(sprintId)) {
          map.set(sprintId, release);
        }
      }
    }

    return map;
  }

  private deriveEtaConfidence(score: number): RoadmapEtaConfidence {
    if (score >= 80) {
      return RoadmapEtaConfidence.High;
    }

    if (score >= 50) {
      return RoadmapEtaConfidence.Medium;
    }

    return RoadmapEtaConfidence.Low;
  }

  private deriveRiskLevel(impact: RoadmapImpact): RoadmapRiskLevel {
    if (
      impact.revenueAtRisk >= 50000 ||
      impact.strategicAccounts >= 5 ||
      impact.customers >= 12
    ) {
      return 'high';
    }

    if (
      impact.revenueAtRisk >= 15000 ||
      impact.strategicAccounts >= 2 ||
      impact.customers >= 5
    ) {
      return 'medium';
    }

    return 'low';
  }

  private impactValue(impact: RoadmapImpact): number {
    return (
      impact.revenueAtRisk +
      impact.strategicAccounts * 10000 +
      impact.customers * 2000
    );
  }

  private matchesAudience(
    item: RoadmapItemEntity,
    audience: RoadmapAudience,
  ): boolean {
    if (audience === RoadmapAudience.All) {
      return true;
    }

    if (audience === RoadmapAudience.Exec) {
      return (
        item.score >= 70 ||
        item.riskLevel === 'high' ||
        item.impact.revenueAtRisk >= 30000
      );
    }

    if (audience === RoadmapAudience.Engineering) {
      return (
        item.category === RoadmapItemCategory.Task ||
        item.category === RoadmapItemCategory.Release
      );
    }

    if (audience === RoadmapAudience.Product) {
      return (
        item.category === RoadmapItemCategory.Feature ||
        item.category === RoadmapItemCategory.Release ||
        item.category === RoadmapItemCategory.Request
      );
    }

    return (
      item.category === RoadmapItemCategory.Request ||
      item.category === RoadmapItemCategory.Feature
    );
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
