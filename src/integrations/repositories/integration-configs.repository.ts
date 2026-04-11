import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationProvider } from '../entities/integration-provider.enum';
import { IntegrationConfigModel } from './integration-config.schema';

export interface SlackConfigRecord {
  webhookUrl: string;
  defaultChannel?: string;
}

export interface FirefliesConfigRecord {
  apiKey: string;
  workspaceId?: string;
  projectId?: string;
  defaultLanguage?: string;
  updatedAt: string;
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

  async upsertFirefliesConfig(
    organizationId: string,
    config: Omit<FirefliesConfigRecord, 'updatedAt'>,
  ): Promise<void> {
    await this.integrationConfigModel
      .updateOne(
        {
          organizationId,
          provider: IntegrationProvider.Fireflies,
        },
        {
          $set: {
            organizationId,
            provider: IntegrationProvider.Fireflies,
            apiKey: config.apiKey,
            workspaceId: config.workspaceId,
            projectId: config.projectId,
            defaultLanguage: config.defaultLanguage,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async findFirefliesConfig(
    organizationId: string,
  ): Promise<FirefliesConfigRecord | undefined> {
    const doc = await this.integrationConfigModel
      .findOne({
        organizationId,
        provider: IntegrationProvider.Fireflies,
      })
      .lean<IntegrationConfigModel>()
      .exec();

    if (!doc?.apiKey || !doc.updatedAt) {
      return undefined;
    }

    return {
      apiKey: doc.apiKey,
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      defaultLanguage: doc.defaultLanguage,
      updatedAt: doc.updatedAt,
    };
  }
}
