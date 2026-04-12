import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationLogModel } from './integration-log.schema';

export interface IntegrationLogEntity {
  id: string;
  organizationId: string;
  provider: string;
  operation: string;
  status: string;
  correlationId?: string;
  errorMessage?: string;
  retryCount: number;
  payload: Record<string, unknown>;
  occurredAt: string;
}

@Injectable()
export class IntegrationLogsRepository {
  constructor(
    @InjectModel(IntegrationLogModel.name)
    private readonly model: Model<IntegrationLogModel>,
  ) {}

  async insert(log: IntegrationLogEntity): Promise<void> {
    await this.model.create(log);
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<IntegrationLogEntity | undefined> {
    const doc = await this.model
      .findOne({ id, organizationId })
      .select({ _id: 0 })
      .lean<IntegrationLogEntity>()
      .exec();

    return doc ?? undefined;
  }

  async update(log: IntegrationLogEntity): Promise<void> {
    await this.model
      .updateOne(
        { id: log.id, organizationId: log.organizationId },
        { $set: log },
      )
      .exec();
  }

  async list(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      provider?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{ items: IntegrationLogEntity[]; total: number }> {
    const filter: Record<string, unknown> = { organizationId };

    if (options.provider) {
      filter.provider = options.provider;
    }

    if (options.status) {
      filter.status = options.status;
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

    const total = await this.model.countDocuments(filter).exec();

    const docs = await this.model
      .find(filter)
      .select({ _id: 0 })
      .sort({ occurredAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<IntegrationLogEntity[]>()
      .exec();

    return { items: docs, total };
  }
}
