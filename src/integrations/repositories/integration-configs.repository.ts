import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationProvider } from '../entities/integration-provider.enum';
import { IntegrationConfigModel } from './integration-config.schema';

export interface SlackConfigRecord {
  webhookUrl: string;
  defaultChannel?: string;
}

@Injectable()
export class IntegrationConfigsRepository {
  constructor(
    @InjectModel(IntegrationConfigModel.name)
    private readonly integrationConfigModel: Model<IntegrationConfigModel>,
  ) {}

  async upsertSlackConfig(
    organizationId: string,
    config: SlackConfigRecord,
  ): Promise<void> {
    await this.integrationConfigModel
      .updateOne(
        {
          organizationId,
          provider: IntegrationProvider.Slack,
        },
        {
          $set: {
            organizationId,
            provider: IntegrationProvider.Slack,
            webhookUrl: config.webhookUrl,
            defaultChannel: config.defaultChannel,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async findSlackConfig(
    organizationId: string,
  ): Promise<SlackConfigRecord | undefined> {
    const doc = await this.integrationConfigModel
      .findOne({
        organizationId,
        provider: IntegrationProvider.Slack,
      })
      .lean<IntegrationConfigModel>()
      .exec();

    if (!doc?.webhookUrl) {
      return undefined;
    }

    return {
      webhookUrl: doc.webhookUrl,
      defaultChannel: doc.defaultChannel,
    };
  }
}
