import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestsService } from '../requests/requests.service';
import { ProductService } from '../product/product.service';
import { EngineeringService } from '../engineering/engineering.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import { FeatureStatus } from '../product/entities/feature-status.enum';
import { TaskStatus } from '../engineering/entities/task-status.enum';
import { UsersService } from '../users/users.service';

interface DateRange {
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
}

interface PaginatedListResult<T> {
  items: T[];
  totalPages: number;
}

@Injectable()
export class AnalyticsService {
  private static readonly PAGE_LIMIT = 100;
  private static readonly DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

  constructor(
    private readonly requestsService: RequestsService,
    private readonly productService: ProductService,
    private readonly engineeringService: EngineeringService,
    private readonly domainEventsService: DomainEventsService,
    private readonly usersService: UsersService,
  ) {}

  async getAdoptionMetrics(
    organizationId: string,
    options: {
      startDate: string;
      endDate: string;
      teamId?: string;
    },
  ) {
    const range = this.normalizeDateRange(options.startDate, options.endDate);
    const teamActorIds = options.teamId
      ? await this.resolveTeamActorIds(organizationId, options.teamId)
      : undefined;

    if (teamActorIds && teamActorIds.size === 0) {
      return {
        requestsCreated: 0,
        votesCount: 0,
        completedCycles: 0,
        completedTasks: 0,
        activeUsers: 0,
        period: {
          startDate: range.startIso,
          endDate: range.endIso,
        },
      };
    }

    const [requests, features, tasks] = await Promise.all([
      this.collectAllRequests(organizationId),
      this.collectAllFeatures(organizationId),
      this.collectAllTasks(organizationId),
    ]);

    const scopedRequests = this.filterByActors(requests, teamActorIds);
    const scopedFeatures = this.filterByActors(features, teamActorIds);
    const scopedTasks = this.filterByActors(tasks, teamActorIds);

    const requestsCreated = scopedRequests.filter((request) =>
      this.inRange(request.createdAt, range),
    ).length;

    const votesCount = scopedRequests
      .filter((request) => this.inRange(request.createdAt, range))
      .reduce((sum, request) => sum + (request.votes ?? 0), 0);

    const completedFeatures = scopedFeatures.filter(
      (feature) =>
        feature.status === FeatureStatus.Done &&
        this.inRange(feature.updatedAt, range),
    );

    const completedTasks = scopedTasks.filter(
      (task) =>
        task.status === TaskStatus.Done && this.inRange(task.updatedAt, range),
    );

    const completedCycles = completedFeatures.length;

    const activeUsers = await this.domainEventsService.countActiveActorsInRange(
      {
        organizationId,
        startDate: range.startIso,
        endDate: range.endIso,
        actorIds: teamActorIds ? Array.from(teamActorIds) : undefined,
      },
    );

    return {
      requestsCreated,
      votesCount,
      completedCycles,
      completedTasks: completedTasks.length,
      activeUsers,
      period: {
        startDate: range.startIso,
        endDate: range.endIso,
      },
    };
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

  private async collectAllPages<T>(
    fetchPage: (page: number, limit: number) => Promise<PaginatedListResult<T>>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await fetchPage(page, AnalyticsService.PAGE_LIMIT);
      items.push(...result.items);

      totalPages = result.totalPages;
      if (totalPages === 0) {
        break;
      }

      page += 1;
    }

    return items;
  }

  private async resolveTeamActorIds(
    organizationId: string,
    teamId: string,
  ): Promise<Set<string>> {
    const userIds = await this.usersService.listUserIdsByTeam(
      organizationId,
      teamId,
    );
    return new Set(userIds);
  }

  private filterByActors<T extends { createdBy: string }>(
    items: T[],
    actorIds?: Set<string>,
  ): T[] {
    if (!actorIds) {
      return items;
    }

    return items.filter((item) => actorIds.has(item.createdBy));
  }

  private normalizeDateRange(startDate: string, endDate: string): DateRange {
    const start = this.parseRangeBoundary(startDate, 'start');
    const end = this.parseRangeBoundary(endDate, 'end');

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate.');
    }

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  private parseRangeBoundary(value: string, boundary: 'start' | 'end'): Date {
    const trimmed = value.trim();
    const match = AnalyticsService.DATE_ONLY_PATTERN.exec(trimmed);

    if (match) {
      const [, yearRaw, monthRaw, dayRaw] = match;
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const day = Number(dayRaw);

      const date =
        boundary === 'start'
          ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        throw new BadRequestException('Invalid startDate or endDate.');
      }

      return date;
    }

    return new Date(trimmed);
  }

  private inRange(dateStr: string | undefined, range: DateRange): boolean {
    if (!dateStr) {
      return false;
    }

    const dateMs = Date.parse(dateStr);
    if (Number.isNaN(dateMs)) {
      return false;
    }

    return dateMs >= range.startMs && dateMs <= range.endMs;
  }
}
