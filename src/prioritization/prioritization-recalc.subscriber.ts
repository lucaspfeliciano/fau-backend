import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import type { DomainEvent } from '../common/events/domain-event.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { PrioritizationService } from './prioritization.service';

const RECALC_DEBOUNCE_MS = 500;

/** Domain events that affect request/feature prioritization inputs or weights context */
const EVENTS_REQUIRING_FEATURE_SCORE_SYNC = new Set([
  'request.created',
  'request.updated',
  'request.voted',
  'request.status_changed',
  'request.customer_linked',
  'request.customer_unlinked',
  'request.company_linked',
  'request.company_unlinked',
  'company.created',
  'company.updated',
  'product.feature_created',
  'product.feature_updated',
  'product.feature_request_linked',
]);

@Injectable()
export class PrioritizationRecalcSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrioritizationRecalcSubscriber.name);
  private unsubscribe?: () => void;
  private readonly debouncers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly domainEvents: DomainEventsService,
    private readonly prioritizationService: PrioritizationService,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.domainEvents.subscribe((event) => {
      void this.onEvent(event);
    });
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    for (const timer of this.debouncers.values()) {
      clearTimeout(timer);
    }
    this.debouncers.clear();
  }

  private onEvent(event: DomainEvent): void {
    if (!event.organizationId) {
      return;
    }

    if (!EVENTS_REQUIRING_FEATURE_SCORE_SYNC.has(event.name)) {
      return;
    }

    const organizationId = event.organizationId;
    const existing = this.debouncers.get(organizationId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debouncers.delete(organizationId);
      void this.runSync(organizationId);
    }, RECALC_DEBOUNCE_MS);

    this.debouncers.set(organizationId, timer);
  }

  private async runSync(organizationId: string): Promise<void> {
    try {
      await this.prioritizationService.syncAutomaticFeatureScores(organizationId);
    } catch (error) {
      this.logger.warn(
        `Prioritization sync failed for org ${organizationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
