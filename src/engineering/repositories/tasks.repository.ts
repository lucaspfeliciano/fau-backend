import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TaskEntity } from '../entities/task.entity';
import { TaskModel } from './task.schema';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(TaskModel.name)
    private readonly taskModel: Model<TaskModel>,
  ) {}

  async insert(task: TaskEntity): Promise<void> {
    await this.taskModel.create(task);
  }

  async update(task: TaskEntity): Promise<void> {
    await this.taskModel
      .updateOne(
        {
          id: task.id,
          organizationId: task.organizationId,
        },
        {
          $set: task,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<TaskEntity | undefined> {
    const doc = await this.taskModel
      .findOne({ id, organizationId })
      .lean<TaskEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(organizationId: string): Promise<TaskEntity[]> {
    return this.taskModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<TaskEntity[]>()
      .exec();
  }

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      sprintId?: string;
      featureId?: string;
      search?: string;
    },
  ): Promise<{ items: TaskEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.sprintId) {
      filter.sprintId = options.sprintId;
    }

    if (options.featureId) {
      filter.featureId = options.featureId;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.taskModel.countDocuments(filter).exec();

    const docs = await this.taskModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<TaskEntity[]>()
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
