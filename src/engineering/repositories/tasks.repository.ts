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
}
