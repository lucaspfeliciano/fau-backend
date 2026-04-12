import { Injectable } from '@nestjs/common';
import { DomainEventsService } from '../common/events/domain-events.service';
import { HealthEventsRepository } from './repositories/health-events.repository';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthEventsRepository: HealthEventsRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async listEvents(options: {
    page: number;
    limit: number;
    severity?: string;
    component?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const result = await this.healthEventsRepository.list(options);
    const summary = await this.healthEventsRepository.getSummary({
      startDate: options.startDate,
      endDate: options.endDate,
    });

    return {
      items: result.items,
      total: result.total,
      page: options.page,
      limit: options.limit,
      summary,
    };
  }

  getEventPipelineStatus() {
    return this.domainEventsService.getOperationalSnapshot();
  }
}
