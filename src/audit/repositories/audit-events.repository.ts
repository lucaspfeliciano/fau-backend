import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuditEventEntity } from '../entities/audit-event.entity';
import { AuditEventModel } from './audit-event.schema';

@Injectable()
export class AuditEventsRepository {
  constructor(
    @InjectModel(AuditEventModel.name)
    private readonly auditModel: Model<AuditEventModel>,
  ) {}

  async insert(event: AuditEventEntity): Promise<void> {
    try {
      await this.auditModel.create(event);
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        return;
      }
      throw error;
    }
  }

  async list(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      actorId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ items: AuditEventEntity[]; total: number }> {
    const filter: Record<string, unknown> = { organizationId };

    if (options.actorId) {
      filter.actorId = options.actorId;
    }

    if (options.action) {
      filter.action = options.action;
    }

    if (options.startDate || options.endDate) {
      const dateFilter: Record<string, string> = {};
      if (options.startDate) {
        dateFilter.$gte = options.startDate;
      }
      if (options.endDate) {
        dateFilter.$lte = options.endDate;
      }
      filter.occurredAt = dateFilter;
    }

    const total = await this.auditModel.countDocuments(filter).exec();

    const docs = await this.auditModel
      .find(filter)
      .select({ _id: 0 })
      .sort({ occurredAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<AuditEventEntity[]>()
      .exec();

    return { items: docs, total };
  }
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  );
}
