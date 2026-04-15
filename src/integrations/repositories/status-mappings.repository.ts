import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StatusMappingModel } from './status-mapping.schema';

export interface StatusMappingEntity {
  organizationId: string;
  provider: string;
  items: Array<{
    linearStatus: string;
    internalStatus: string;
    enabled: boolean;
  }>;
  updatedAt: string;
  updatedBy?: string;
}

@Injectable()
export class StatusMappingsRepository {
  constructor(
    @InjectModel(StatusMappingModel.name)
    private readonly model: Model<StatusMappingModel>,
  ) {}

  async findByOrganizationAndProvider(
    organizationId: string,
    provider: string,
  ): Promise<StatusMappingEntity | undefined> {
    const doc = await this.model
      .findOne({ organizationId, provider })
      .select({ _id: 0 })
      .lean<StatusMappingEntity>()
      .exec();

    return doc ?? undefined;
  }

  async upsert(mapping: StatusMappingEntity): Promise<void> {
    await this.model
      .updateOne(
        {
          organizationId: mapping.organizationId,
          provider: mapping.provider,
        },
        { $set: mapping },
        { upsert: true },
      )
      .exec();
  }

  async deleteByProvider(
    organizationId: string,
    provider: string,
  ): Promise<void> {
    await this.model.deleteMany({ organizationId, provider }).exec();
  }
}
