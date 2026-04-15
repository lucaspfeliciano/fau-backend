import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationProvider } from '../entities/integration-provider.enum';
import { IntegrationCursorModel } from './integration-cursor.schema';

@Injectable()
export class IntegrationCursorsRepository {
  constructor(
    @InjectModel(IntegrationCursorModel.name)
    private readonly integrationCursorModel: Model<IntegrationCursorModel>,
  ) {}

  async get(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<number> {
    const doc = await this.integrationCursorModel
      .findOne({ organizationId, provider })
      .lean<IntegrationCursorModel>()
      .exec();

    return doc?.cursor ?? 0;
  }

  async set(
    organizationId: string,
    provider: IntegrationProvider,
    cursor: number,
  ): Promise<void> {
    await this.integrationCursorModel
      .updateOne(
        { organizationId, provider },
        {
          $set: {
            organizationId,
            provider,
            cursor,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async deleteByProvider(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<void> {
    await this.integrationCursorModel
      .deleteMany({ organizationId, provider })
      .exec();
  }
}
