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

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      initiativeId?: string;
      search?: string;
    },
  ): Promise<{ items: FeatureEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    if (options.initiativeId) {
      filter.initiativeId = options.initiativeId;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.featureModel.countDocuments(filter).exec();

    const docs = await this.featureModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<FeatureEntity[]>()
      .exec();

    return {
      items: docs,
      total,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
