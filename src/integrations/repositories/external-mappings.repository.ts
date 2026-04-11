import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ExternalMappingEntity } from '../entities/external-mapping.entity';
import { ExternalMappingModel } from './external-mapping.schema';

@Injectable()
export class ExternalMappingsRepository {
  constructor(
    @InjectModel(ExternalMappingModel.name)
    private readonly externalMappingModel: Model<ExternalMappingModel>,
  ) {}

  async upsert(mapping: ExternalMappingEntity): Promise<void> {
    await this.externalMappingModel
      .updateOne(
        {
          organizationId: mapping.organizationId,
          provider: mapping.provider,
          entityType: mapping.entityType,
          internalId: mapping.internalId,
        },
        {
          $set: mapping,
        },
        { upsert: true },
      )
      .exec();
  }

  async findByInternal(
    organizationId: string,
    provider: string,
    entityType: ExternalMappingEntity['entityType'],
    internalId: string,
  ): Promise<ExternalMappingEntity | undefined> {
    const doc = await this.externalMappingModel
      .findOne({ organizationId, provider, entityType, internalId })
      .lean<ExternalMappingEntity>()
      .exec();

    return doc ?? undefined;
  }

  async findByExternal(
    organizationId: string,
    provider: string,
    entityType: ExternalMappingEntity['entityType'],
    externalId: string,
  ): Promise<ExternalMappingEntity | undefined> {
    const doc = await this.externalMappingModel
      .findOne({ organizationId, provider, entityType, externalId })
      .lean<ExternalMappingEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<ExternalMappingEntity[]> {
    return this.externalMappingModel
      .find({ organizationId })
      .lean<ExternalMappingEntity[]>()
      .exec();
  }

  async deleteById(id: string, organizationId: string): Promise<void> {
    await this.externalMappingModel.deleteOne({ id, organizationId }).exec();
  }
}
