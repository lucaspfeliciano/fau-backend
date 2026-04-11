import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { FeatureEntity } from '../entities/feature.entity';
import { FeatureModel } from './feature.schema';

@Injectable()
export class FeaturesRepository {
  constructor(
    @InjectModel(FeatureModel.name)
    private readonly featureModel: Model<FeatureModel>,
  ) {}

  async insert(feature: FeatureEntity): Promise<void> {
    await this.featureModel.create(feature);
  }

  async update(feature: FeatureEntity): Promise<void> {
    await this.featureModel
      .updateOne(
        {
          id: feature.id,
          organizationId: feature.organizationId,
        },
        {
          $set: feature,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<FeatureEntity | undefined> {
    const doc = await this.featureModel
      .findOne({ id, organizationId })
      .lean<FeatureEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(organizationId: string): Promise<FeatureEntity[]> {
    return this.featureModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<FeatureEntity[]>()
      .exec();
  }
}
