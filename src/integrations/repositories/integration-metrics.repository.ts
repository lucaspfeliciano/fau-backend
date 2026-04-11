import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationProvider } from '../entities/integration-provider.enum';
import { IntegrationMetricModel } from './integration-metric.schema';

export interface IntegrationMetricsRecord {
  success: number;
  failure: number;
}

@Injectable()
export class IntegrationMetricsRepository {
  constructor(
    @InjectModel(IntegrationMetricModel.name)
    private readonly integrationMetricModel: Model<IntegrationMetricModel>,
  ) {}

  async increment(
    organizationId: string,
    provider: IntegrationProvider,
    kind: keyof IntegrationMetricsRecord,
  ): Promise<void> {
    const field = kind === 'success' ? 'success' : 'failure';
    await this.integrationMetricModel
      .updateOne(
        { organizationId, provider },
        {
          $inc: { [field]: 1 },
          $set: { updatedAt: new Date().toISOString() },
          $setOnInsert: { success: 0, failure: 0 },
        },
        { upsert: true },
      )
      .exec();
  }

  async get(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationMetricsRecord> {
    const doc = await this.integrationMetricModel
      .findOne({ organizationId, provider })
      .lean<IntegrationMetricModel>()
      .exec();

    return {
      success: doc?.success ?? 0,
      failure: doc?.failure ?? 0,
    };
  }
}
