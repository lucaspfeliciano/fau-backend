import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SprintEntity } from '../entities/sprint.entity';
import { SprintModel } from './sprint.schema';

@Injectable()
export class SprintsRepository {
  constructor(
    @InjectModel(SprintModel.name)
    private readonly sprintModel: Model<SprintModel>,
  ) {}

  async insert(sprint: SprintEntity): Promise<void> {
    await this.sprintModel.create(sprint);
  }

  async update(sprint: SprintEntity): Promise<void> {
    await this.sprintModel
      .updateOne(
        {
          id: sprint.id,
          organizationId: sprint.organizationId,
        },
        {
          $set: sprint,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<SprintEntity | undefined> {
    const doc = await this.sprintModel
      .findOne({ id, organizationId })
      .lean<SprintEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(organizationId: string): Promise<SprintEntity[]> {
    return this.sprintModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<SprintEntity[]>()
      .exec();
  }
}
