import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { DomainEvent } from '../domain-event.interface';
import type { OutboxEventStatus } from './outbox.schema';
import { OutboxEventModel } from './outbox.schema';

const MAX_ATTEMPTS = 5;

function backoffMs(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1));
}

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel(OutboxEventModel.name)
    private readonly model: Model<OutboxEventModel>,
  ) {}

  async insertPending(event: DomainEvent): Promise<void> {
    const eventId = event.eventId;
    if (!eventId) {
      throw new Error('Outbox requires eventId');
    }

    await this.model.create({
      eventId,
      organizationId: event.organizationId,
      status: 'pending' as OutboxEventStatus,
      attempts: 0,
      serializedEvent: event as unknown as Record<string, unknown>,
      createdAt: new Date(),
    });
  }

  async markCompleted(eventId: string): Promise<void> {
    await this.model
      .updateOne(
        { eventId },
        {
          $set: {
            status: 'completed' as OutboxEventStatus,
            processedAt: new Date(),
            lastError: undefined,
          },
        },
      )
      .exec();
  }

  async markFailure(eventId: string, errorMessage: string): Promise<void> {
    const doc = await this.model.findOne({ eventId }).exec();
    if (!doc) {
      return;
    }

    const attempts = doc.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await this.model
        .updateOne(
          { eventId },
          {
            $set: {
              status: 'dead_letter' as OutboxEventStatus,
              attempts,
              lastError: errorMessage,
              processedAt: new Date(),
            },
          },
        )
        .exec();
      return;
    }

    const nextRetryAt = new Date(Date.now() + backoffMs(attempts));
    await this.model
      .updateOne(
        { eventId },
        {
          $set: {
            attempts,
            lastError: errorMessage,
            nextRetryAt,
          },
        },
      )
      .exec();
  }

  /**
   * Pending events eligible for background delivery: stale enough that the synchronous
   * publish path is unlikely to still be running, and retry window open.
   */
  async findRetryable(
    limit: number,
    stalePendingMs: number,
  ): Promise<DomainEvent[]> {
    const now = new Date();
    const staleBefore = new Date(Date.now() - stalePendingMs);

    const docs = await this.model
      .find({
        status: 'pending',
        createdAt: { $lt: staleBefore },
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: now } },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((d) => d.serializedEvent as unknown as DomainEvent);
  }
}
