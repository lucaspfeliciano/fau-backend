import { Injectable, Logger } from '@nestjs/common';

import { buildEventEnvelope } from './event-envelope';
import { DomainEvent } from './domain-event.interface';
import { OutboxRepository } from './outbox/outbox.repository';

type Subscriber = (event: DomainEvent) => void | Promise<void>;

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  private readonly events: DomainEvent[] = [];
  private readonly subscribers: Subscriber[] = [];

  constructor(private readonly outboxRepository: OutboxRepository) {}

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
      this.logger.error(
        `Outbox insert failed for ${event.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    this.events.push(enriched);

    try {
      await this.notifySubscribers(enriched);
      await this.outboxRepository.markCompleted(enriched.eventId!);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.outboxRepository.markFailure(enriched.eventId!, message);
      this.logger.warn(
        `Subscriber failure for ${enriched.name} (${enriched.eventId}): ${message}`,
      );
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
    for (const event of events) {
      try {
        await this.notifySubscribers(event);
        await this.outboxRepository.markCompleted(event.eventId!);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.outboxRepository.markFailure(event.eventId!, message);
      }
    }
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
}
