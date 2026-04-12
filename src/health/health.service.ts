import { Injectable } from '@nestjs/common';
import { HealthEventsRepository } from './repositories/health-events.repository';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthEventsRepository: HealthEventsRepository,
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
}
