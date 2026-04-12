import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  EventFailureIncident,
  EventFailureReporter,
} from '../common/events/event-failure-reporter.interface';
import { HealthEventsRepository } from './repositories/health-events.repository';

@Injectable()
export class EventsHealthReporterService implements EventFailureReporter {
  constructor(
    private readonly healthEventsRepository: HealthEventsRepository,
  ) {}

  async report(incident: EventFailureIncident): Promise<void> {
    await this.healthEventsRepository.insert({
      id: randomUUID(),
      component: incident.component,
      severity: incident.severity,
      message: incident.message,
      metadata: incident.metadata ?? {},
      occurredAt: incident.occurredAt,
    });
  }
}
