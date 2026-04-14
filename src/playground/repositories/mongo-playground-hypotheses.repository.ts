import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PlaygroundHypothesisStatus } from '../entities/playground-hypothesis-status.enum';
import type { PlaygroundHypothesisEntity } from '../entities/playground-hypothesis.entity';
import type { PlaygroundHypothesesRepository } from './playground-hypotheses-repository.interface';
import { PlaygroundHypothesisModel } from './playground-hypothesis.schema';

@Injectable()
export class MongoPlaygroundHypothesesRepository
  implements PlaygroundHypothesesRepository
{
  constructor(
    @InjectModel(PlaygroundHypothesisModel.name)
    private readonly playgroundHypothesisModel: Model<PlaygroundHypothesisModel>,
  ) {}

  async insert(hypothesis: PlaygroundHypothesisEntity): Promise<void> {
    await this.playgroundHypothesisModel.create(hypothesis);
  }

  async update(hypothesis: PlaygroundHypothesisEntity): Promise<void> {
    await this.playgroundHypothesisModel
      .updateOne(
        {
          id: hypothesis.id,
          workspaceId: hypothesis.workspaceId,
        },
        {
          $set: hypothesis,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity | undefined> {
    const doc = await this.playgroundHypothesisModel
      .findOne({ id, workspaceId })
      .select({ _id: 0 })
      .lean<PlaygroundHypothesisEntity>()
      .exec();

    return doc ?? undefined;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.playgroundHypothesisModel.deleteOne({ id, workspaceId }).exec();
  }

  async deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.playgroundHypothesisModel
      .deleteMany({ playgroundWorkspaceId, workspaceId })
      .exec();
  }

  async listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity[]> {
    return this.playgroundHypothesisModel
      .find({ playgroundWorkspaceId, workspaceId })
      .sort({ updatedAt: -1 })
      .select({ _id: 0 })
      .lean<PlaygroundHypothesisEntity[]>()
      .exec();
  }

  async queryByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      status?: PlaygroundHypothesisStatus;
      search?: string;
    },
  ): Promise<{ items: PlaygroundHypothesisEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      playgroundWorkspaceId,
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
      filter.$or = [{ statement: searchRegex }, { description: searchRegex }];
    }

    const total = await this.playgroundHypothesisModel
      .countDocuments(filter)
      .exec();

    const items = await this.playgroundHypothesisModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<PlaygroundHypothesisEntity[]>()
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
