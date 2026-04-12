import { Injectable } from '@nestjs/common';
import { RequestsService } from '../requests/requests.service';
import { ProductService } from '../product/product.service';
import { EngineeringService } from '../engineering/engineering.service';
import { DomainEventsService } from '../common/events/domain-events.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly productService: ProductService,
    private readonly engineeringService: EngineeringService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async getAdoptionMetrics(
    organizationId: string,
    options: {
      startDate: string;
      endDate: string;
      teamId?: string;
    },
  ) {
    const requests = (
      await this.requestsService.list(
        { page: 1, limit: 10000, includeArchived: false },
        organizationId,
      )
    ).items;

    const features = (
      await this.productService.listFeatures(
        { page: 1, limit: 10000 },
        organizationId,
      )
    ).items;

    const tasks = (
      await this.engineeringService.listTasks(
        { page: 1, limit: 10000 },
        organizationId,
      )
    ).items;

    const inRange = (dateStr?: string) => {
      if (!dateStr) return false;
      return dateStr >= options.startDate && dateStr <= options.endDate;
    };

    const requestsCreated = requests.filter((r) => inRange(r.createdAt)).length;

    const votesCount = requests
      .filter((r) => inRange(r.createdAt))
      .reduce((sum, r) => sum + (r.votes ?? 0), 0);

    const completedFeatures = features.filter(
      (f) => f.status === 'Done' && inRange(f.updatedAt),
    );

    const completedTasks = tasks.filter(
      (t) => t.status === 'Done' && inRange(t.updatedAt),
    );

    const completedCycles = completedFeatures.length;

    const events = this.domainEventsService.list();
    const rangeEvents = events.filter((e) => inRange(e.occurredAt));

    const activeActors = new Set(
      rangeEvents.filter((e) => e.actorId).map((e) => e.actorId),
    );

    return {
      requestsCreated,
      votesCount,
      completedCycles,
      completedTasks: completedTasks.length,
      activeUsers: activeActors.size,
      period: {
        startDate: options.startDate,
        endDate: options.endDate,
      },
    };
  }
}
