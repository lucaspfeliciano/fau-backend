import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PlaygroundInsightType } from '../entities/playground-insight-type.enum';
import type { PlaygroundInsightEntity } from '../entities/playground-insight.entity';
import type { PlaygroundInsightsRepository } from './playground-insights-repository.interface';
import { PlaygroundInsightModel } from './playground-insight.schema';

@Injectable()
export class MongoPlaygroundInsightsRepository implements PlaygroundInsightsRepository {
  constructor(
    @InjectModel(PlaygroundInsightModel.name)
    private readonly playgroundInsightModel: Model<PlaygroundInsightModel>,
  ) {}

  async insert(insight: PlaygroundInsightEntity): Promise<void> {
    await this.playgroundInsightModel.create(insight);
  }

  async update(insight: PlaygroundInsightEntity): Promise<void> {
    await this.playgroundInsightModel
      .updateOne(
        {
          id: insight.id,
          workspaceId: insight.workspaceId,
        },
        {
          $set: insight,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity | undefined> {
    const doc = await this.playgroundInsightModel
      .findOne({ id, workspaceId })
      .select({ _id: 0 })
      .lean<PlaygroundInsightEntity>()
      .exec();

    return doc ?? undefined;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.playgroundInsightModel.deleteOne({ id, workspaceId }).exec();
  }

  async deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.playgroundInsightModel
      .deleteMany({ playgroundWorkspaceId, workspaceId })
      .exec();
  }

  async listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity[]> {
    return this.playgroundInsightModel
      .find({ playgroundWorkspaceId, workspaceId })
      .sort({ isPinned: -1, sortOrder: 1, updatedAt: -1 })
      .select({ _id: 0 })
      .lean<PlaygroundInsightEntity[]>()
      .exec();
  }

  async queryByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      type?: PlaygroundInsightType;
      pinnedOnly?: boolean;
      search?: string;
    },
  ): Promise<{ items: PlaygroundInsightEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      playgroundWorkspaceId,
      workspaceId,
    };

    if (options.type) {
      filter.type = options.type;
    }

    if (options.pinnedOnly === true) {
      filter.isPinned = true;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { summary: searchRegex }];
    }

    const total = await this.playgroundInsightModel.countDocuments(filter).exec();

    const items = await this.playgroundInsightModel
      .find(filter)
      .sort({ isPinned: -1, sortOrder: 1, updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<PlaygroundInsightEntity[]>()
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