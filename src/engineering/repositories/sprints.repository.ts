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

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    },
  ): Promise<{ items: SprintEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.search) {
      filter.name = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
    }

    const total = await this.sprintModel.countDocuments(filter).exec();

    const docs = await this.sprintModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<SprintEntity[]>()
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
