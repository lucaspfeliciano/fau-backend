import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { buildEventEnvelope } from './event-envelope';
import { DomainEvent } from './domain-event.interface';
import { DOMAIN_EVENT_CATALOG } from './event-catalog';
import {
  EVENT_FAILURE_REPORTER,
  EventFailureReporter,
} from './event-failure-reporter.interface';
import { OutboxRepository } from './outbox/outbox.repository';

type Subscriber = (event: DomainEvent) => void | Promise<void>;

@Injectable()
export class DomainEventsService implements OnModuleInit {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly events: DomainEvent[] = [];
  private readonly subscribers: Subscriber[] = [];
  private failureReporter?: EventFailureReporter;
  private readonly runtime = {
    published: 0,
    replayed: 0,
    outboxInsertFailures: 0,
    subscriberFailures: 0,
    replayFailures: 0,
    lastPublishedAt: undefined as string | undefined,
    lastFailureAt: undefined as string | undefined,
  };

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit(): void {
    try {
      this.failureReporter = this.moduleRef.get<EventFailureReporter>(
        EVENT_FAILURE_REPORTER,
        {
          strict: false,
        },
      );
    } catch {
      this.failureReporter = undefined;
    }
  }

  /**
   * Publishes a domain event: persists to outbox, notifies subscribers, marks complete.
   * Async work is scheduled without blocking the caller (same as before for fire-and-forget callers).
   */
  publish(event: DomainEvent): void {
    void this.publishAsync(event);
  }

  private async publishAsync(event: DomainEvent): Promise<void> {
    const enriched = buildEventEnvelope(event);
    try {
      await this.outboxRepository.insertPending(enriched);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.runtime.outboxInsertFailures += 1;
      this.runtime.lastFailureAt = new Date().toISOString();

      this.logger.error(`Outbox insert failed for ${event.name}: ${message}`);

      await this.reportFailure({
        component: 'events.outbox',
        severity: 'critical',
        message: `Outbox insert failed for ${event.name}`,
        metadata: {
          eventName: event.name,
          eventId: enriched.eventId,
          error: message,
        },
      });

      return;
    }

    this.runtime.published += 1;
    this.runtime.lastPublishedAt = enriched.occurredAt;
    this.events.push(enriched);

    try {
      await this.notifySubscribers(enriched);
      await this.outboxRepository.markCompleted(enriched.eventId!);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.runtime.subscriberFailures += 1;
      this.runtime.lastFailureAt = new Date().toISOString();
      await this.outboxRepository.markFailure(enriched.eventId!, message);
      this.logger.warn(
        `Subscriber failure for ${enriched.name} (${enriched.eventId}): ${message}`,
      );

      await this.reportFailure({
        component: 'events.subscribers',
        severity: 'error',
        message: `Subscriber failure for ${enriched.name}`,
        metadata: {
          eventName: enriched.name,
          eventId: enriched.eventId,
          error: message,
        },
      });
    }
  }

  async processOutboxBatch(
    limit: number,
    stalePendingMs: number,
  ): Promise<void> {
    const events = await this.outboxRepository.findRetryable(
      limit,
      stalePendingMs,
    );

    this.runtime.replayed += events.length;

    for (const event of events) {
      try {
        await this.notifySubscribers(event);
        await this.outboxRepository.markCompleted(event.eventId!);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.runtime.replayFailures += 1;
        this.runtime.lastFailureAt = new Date().toISOString();
        await this.outboxRepository.markFailure(event.eventId!, message);

        await this.reportFailure({
          component: 'events.replay',
          severity: 'warning',
          message: `Outbox replay failed for ${event.name}`,
          metadata: {
            eventName: event.name,
            eventId: event.eventId,
            error: message,
          },
        });
      }
    }
  }

  async countActiveActorsInRange(options: {
    organizationId: string;
    startDate: string;
    endDate: string;
    actorIds?: string[];
  }): Promise<number> {
    if (options.actorIds && options.actorIds.length === 0) {
      return 0;
    }

    return this.outboxRepository.countDistinctActorsByRange(options);
  }

  async getOperationalSnapshot(): Promise<{
    runtime: {
      published: number;
      replayed: number;
      outboxInsertFailures: number;
      subscriberFailures: number;
      replayFailures: number;
      subscriberCount: number;
      inMemoryBufferedEvents: number;
      lastPublishedAt?: string;
      lastFailureAt?: string;
    };
    outbox: {
      pending: number;
      completed: number;
      deadLetter: number;
      retryable: number;
      oldestPendingAt?: string;
      oldestDeadLetterAt?: string;
    };
    catalog: {
      items: typeof DOMAIN_EVENT_CATALOG;
      knownNames: string[];
      undocumentedObservedNames: string[];
    };
  }> {
    const [stats, observedNames] = await Promise.all([
      this.outboxRepository.getOperationalStats(),
      this.outboxRepository.listKnownEventNames(),
    ]);

    const documentedNames = new Set(
      DOMAIN_EVENT_CATALOG.map((item) => item.name),
    );
    const knownNames = new Set<string>([
      ...observedNames,
      ...Array.from(documentedNames),
    ]);

    return {
      runtime: {
        ...this.runtime,
        subscriberCount: this.subscribers.length,
        inMemoryBufferedEvents: this.events.length,
      },
      outbox: stats,
      catalog: {
        items: DOMAIN_EVENT_CATALOG,
        knownNames: Array.from(knownNames).sort((a, b) => a.localeCompare(b)),
        undocumentedObservedNames: observedNames
          .filter((name) => !documentedNames.has(name))
          .sort((a, b) => a.localeCompare(b)),
      },
    };
  }

  list(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  subscribe(handler: Subscriber): () => void {
    this.subscribers.push(handler);

    return () => {
      const index = this.subscribers.indexOf(handler);
      if (index >= 0) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private async notifySubscribers(event: DomainEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      await Promise.resolve(subscriber(event));
    }
  }

  private async reportFailure(options: {
    component: string;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.failureReporter) {
      try {
        this.failureReporter = this.moduleRef.get<EventFailureReporter>(
          EVENT_FAILURE_REPORTER,
          {
            strict: false,
          },
        );
      } catch {
        this.failureReporter = undefined;
      }
    }

    if (!this.failureReporter) {
      return;
    }

    try {
      await this.failureReporter.report({
        component: options.component,
        severity: options.severity,
        message: options.message,
        metadata: options.metadata,
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Failure reporter unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
