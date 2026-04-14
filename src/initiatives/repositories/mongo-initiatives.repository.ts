import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { InitiativeEntity } from '../entities/initiative.entity';
import type { InitiativesRepository } from './initiatives-repository.interface';
import { PlanningInitiativeModel } from './initiative.schema';

@Injectable()
export class MongoInitiativesRepository implements InitiativesRepository {
  constructor(
    @InjectModel(PlanningInitiativeModel.name)
    private readonly initiativeModel: Model<PlanningInitiativeModel>,
  ) {}

  async insert(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel.create(initiative);
  }

  async update(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel
      .updateOne(
        {
          id: initiative.id,
          workspaceId: initiative.workspaceId,
        },
        {
          $set: initiative,
        },
      )
      .exec();
  }

  async findById(
    initiativeId: string,
    workspaceId: string,
  ): Promise<InitiativeEntity | undefined> {
    const doc = await this.initiativeModel
      .findOne({
        id: initiativeId,
        workspaceId,
      })
      .select({ _id: 0 })
      .lean<InitiativeEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByWorkspace(workspaceId: string): Promise<InitiativeEntity[]> {
    return this.initiativeModel
      .find({ workspaceId })
      .sort({ title: 1 })
      .select({ _id: 0 })
      .lean<InitiativeEntity[]>()
      .exec();
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    },
  ): Promise<{ items: InitiativeEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.initiativeModel.countDocuments(filter).exec();
    const items = await this.initiativeModel
      .find(filter)
      .sort({ title: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<InitiativeEntity[]>()
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
