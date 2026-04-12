import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { InitiativeEntity } from '../entities/initiative.entity';
import { InitiativeModel } from './initiative.schema';

@Injectable()
export class InitiativesRepository {
  constructor(
    @InjectModel(InitiativeModel.name)
    private readonly initiativeModel: Model<InitiativeModel>,
  ) {}

  async insert(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel.create(initiative);
  }

  async update(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel
      .updateOne(
        {
          id: initiative.id,
          organizationId: initiative.organizationId,
        },
        {
          $set: initiative,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<InitiativeEntity | undefined> {
    const doc = await this.initiativeModel
      .findOne({ id, organizationId })
      .lean<InitiativeEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<InitiativeEntity[]> {
    return this.initiativeModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<InitiativeEntity[]>()
      .exec();
  }

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      search?: string;
    },
  ): Promise<{ items: InitiativeEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.priority) {
      filter.priority = options.priority;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.initiativeModel.countDocuments(filter).exec();

    const docs = await this.initiativeModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<InitiativeEntity[]>()
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
