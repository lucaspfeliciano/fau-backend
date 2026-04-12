import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { PrioritizationWeightsEntity } from '../entities/prioritization-weights.entity';
import { PrioritizationWeightsModel } from './prioritization-weights.schema';

@Injectable()
export class PrioritizationWeightsRepository {
  constructor(
    @InjectModel(PrioritizationWeightsModel.name)
    private readonly model: Model<PrioritizationWeightsModel>,
  ) {}

  async findByOrganizationId(
    organizationId: string,
  ): Promise<PrioritizationWeightsEntity | undefined> {
    const doc = await this.model
      .findOne({ organizationId })
      .select({ _id: 0 })
      .lean<PrioritizationWeightsEntity>()
      .exec();

    return doc ?? undefined;
  }

  async upsert(entity: PrioritizationWeightsEntity): Promise<void> {
    await this.model
      .updateOne(
        { organizationId: entity.organizationId },
        { $set: entity },
        { upsert: true },
      )
      .exec();
  }
}
