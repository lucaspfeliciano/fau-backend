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

  async countDistinctActorsByRange(options: {
    organizationId: string;
    startDate: string;
    endDate: string;
    actorIds?: string[];
  }): Promise<number> {
    const match: Record<string, unknown> = {
      organizationId: options.organizationId,
      'serializedEvent.occurredAt': {
        $gte: options.startDate,
        $lte: options.endDate,
      },
    };

    if (options.actorIds && options.actorIds.length > 0) {
      match['serializedEvent.actorId'] = { $in: options.actorIds };
    } else {
      match['serializedEvent.actorId'] = { $exists: true, $ne: null };
    }

    const result = await this.model
      .aggregate<{ count: number }>([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$serializedEvent.actorId',
          },
        },
        {
          $count: 'count',
        },
      ])
      .exec();

    return result[0]?.count ?? 0;
  }

  async listKnownEventNames(): Promise<string[]> {
    const names = await this.model.distinct('serializedEvent.name').exec();

    return names
      .filter((name): name is string => typeof name === 'string')
      .sort((a, b) => a.localeCompare(b));
  }

  async getOperationalStats(): Promise<{
    pending: number;
    completed: number;
    deadLetter: number;
    retryable: number;
    oldestPendingAt?: string;
    oldestDeadLetterAt?: string;
  }> {
    const now = new Date();

    const [
      pending,
      completed,
      deadLetter,
      retryable,
      oldestPendingDoc,
      oldestDeadLetterDoc,
    ] = await Promise.all([
      is.model.countDocuments({ status: 'pending' }).exec(),
     tis.model.countDocuments({ status: 'completed' }).exec(),
    this.model.countDocuments({ status: 'dead_letter' }).exec(),
      is.model
       .ountDocuments({
        status: 'pending',
          r: [
           {nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: now } },
          
       }
      .exec(),
      is.model
       .indOne({ status: 'pending' })
      .select({ createdAt: 1, _id: 0 })
        ort({ createdAt: 1 })
       .ean<{ createdAt: Date }>()
      .exec(),
      is.model
       .indOne({ status: 'dead_letter' })
      .select({ createdAt: 1, _id: 0 })
        ort({ createdAt: 1 })
       .ean<{ createdAt: Date }>()
      .exec(),
    ]);

    return {
      pending,
      completed,
      deadLetter,
      retryable,
      oldestPendingAt: oldestPendingDoc?.createdAt?.toISOString(),
      oldestDeadLetterAt: oldestDeadLetterDoc?.createdAt?.toISOString(),
    };
  }
}
