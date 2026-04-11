import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { RoadmapViewEntity } from '../entities/roadmap-view.entity';
import { RoadmapViewModel } from './roadmap-view.schema';

@Injectable()
export class RoadmapViewsRepository {
  constructor(
    @InjectModel(RoadmapViewModel.name)
    private readonly roadmapViewModel: Model<RoadmapViewModel>,
  ) {}

  async insert(view: RoadmapViewEntity): Promise<void> {
    await this.roadmapViewModel.create(view);
  }

  async update(view: RoadmapViewEntity): Promise<void> {
    await this.roadmapViewModel
      .updateOne(
        {
          id: view.id,
          organizationId: view.organizationId,
        },
        {
          $set: view,
        },
      )
      .exec();
  }

  async deleteById(id: string, organizationId: string): Promise<void> {
    await this.roadmapViewModel.deleteOne({ id, organizationId }).exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<RoadmapViewEntity | undefined> {
    const doc = await this.roadmapViewModel
      .findOne({ id, organizationId })
      .select({ _id: 0 })
      .lean<RoadmapViewEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<RoadmapViewEntity[]> {
    return this.roadmapViewModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .select({ _id: 0 })
      .lean<RoadmapViewEntity[]>()
      .exec();
  }
}
