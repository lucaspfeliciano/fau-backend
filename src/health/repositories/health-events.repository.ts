import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { HealthEventEntity } from '../entities/health-event.entity';
import { HealthEventModel } from './health-event.schema';

@Injectable()
export class HealthEventsRepository {
  constructor(
    @InjectModel(HealthEventModel.name)
    private readonly healthModel: Model<HealthEventModel>,
  ) {}

  async insert(event: HealthEventEntity): Promise<void> {
    await this.healthModel.create(event);
  }

  async list(options: {
    page: number;
    limit: number;
    severity?: string;
    component?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: HealthEventEntity[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (options.severity) {
      filter.severity = options.severity;
    }

    if (options.component) {
      filter.component = options.component;
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

    const total = await this.healthModel.countDocuments(filter).exec();

    const docs = await this.healthModel
      .find(filter)
      .select({ _id: 0 })
      .sort({ occurredAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<HealthEventEntity[]>()
      .exec();

    return { items: docs, total };
  }

  async getSummary(options: { startDate?: string; endDate?: string }): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
  }> {
    const filter: Record<string, unknown> = {};

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

    const docs = await this.healthModel
      .find(filter)
      .select({ severity: 1, component: 1 })
      .lean()
      .exec();

    const bySeverity: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    for (const doc of docs) {
      bySeverity[doc.severity] = (bySeverity[doc.severity] ?? 0) + 1;
      byComponent[doc.component] = (byComponent[doc.component] ?? 0) + 1;
    }

    return {
      total: docs.length,
      bySeverity,
      byComponent,
    };
  }
}
