import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SprintEntity } from '../entities/sprint.entity';
import type { SprintsRepository } from './sprints-repository.interface';
import { PlanningSprintModel } from './sprint.schema';

@Injectable()
export class MongoSprintsRepository implements SprintsRepository {
  constructor(
    @InjectModel(PlanningSprintModel.name)
    private readonly sprintModel: Model<PlanningSprintModel>,
  ) {}

  async insert(sprint: SprintEntity): Promise<void> {
    await this.sprintModel.create(sprint);
  }

  async update(sprint: SprintEntity): Promise<void> {
    await this.sprintModel
      .updateOne(
        {
          id: sprint.id,
          workspaceId: sprint.workspaceId,
        },
        {
          $set: sprint,
        },
      )
      .exec();
  }

  async findById(
    sprintId: string,
    workspaceId: string,
  ): Promise<SprintEntity | undefined> {
    const doc = await this.sprintModel
      .findOne({
        id: sprintId,
        workspaceId,
      })
      .select({ _id: 0 })
      .lean<SprintEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByWorkspace(workspaceId: string): Promise<SprintEntity[]> {
    return this.sprintModel
      .find({ workspaceId })
      .sort({ name: 1 })
      .select({ _id: 0 })
      .lean<SprintEntity[]>()
      .exec();
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      initiativeId?: string;
      status?: string;
      squad?: string;
      search?: string;
    },
  ): Promise<{ items: SprintEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId,
    };

    if (options.initiativeId) {
      filter.initiativeId = options.initiativeId;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.squad) {
      filter.squad = options.squad;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [
        { name: searchRegex },
        { squad: searchRegex },
        { externalLinearSprintId: searchRegex },
      ];
    }

    const total = await this.sprintModel.countDocuments(filter).exec();
    const items = await this.sprintModel
      .find(filter)
      .sort({ name: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<SprintEntity[]>()
      .exec();

    return {
      items,
      total,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
