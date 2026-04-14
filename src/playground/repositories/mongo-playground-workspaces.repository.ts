import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PlaygroundWorkspaceEntity } from '../entities/playground-workspace.entity';
import type { PlaygroundWorkspacesRepository } from './playground-workspaces-repository.interface';
import { PlaygroundWorkspaceModel } from './playground-workspace.schema';

@Injectable()
export class MongoPlaygroundWorkspacesRepository
  implements PlaygroundWorkspacesRepository
{
  constructor(
    @InjectModel(PlaygroundWorkspaceModel.name)
    private readonly playgroundWorkspaceModel: Model<PlaygroundWorkspaceModel>,
  ) {}

  async insert(workspace: PlaygroundWorkspaceEntity): Promise<void> {
    await this.playgroundWorkspaceModel.create(workspace);
  }

  async update(workspace: PlaygroundWorkspaceEntity): Promise<void> {
    await this.playgroundWorkspaceModel
      .updateOne(
        {
          id: workspace.id,
          workspaceId: workspace.workspaceId,
        },
        {
          $set: workspace,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundWorkspaceEntity | undefined> {
    const doc = await this.playgroundWorkspaceModel
      .findOne({ id, workspaceId })
      .select({ _id: 0 })
      .lean<PlaygroundWorkspaceEntity>()
      .exec();

    return doc ?? undefined;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.playgroundWorkspaceModel.deleteOne({ id, workspaceId }).exec();
  }

  async listByWorkspace(workspaceId: string): Promise<PlaygroundWorkspaceEntity[]> {
    return this.playgroundWorkspaceModel
      .find({ workspaceId })
      .sort({ updatedAt: -1 })
      .select({ _id: 0 })
      .lean<PlaygroundWorkspaceEntity[]>()
      .exec();
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
    },
  ): Promise<{ items: PlaygroundWorkspaceEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId,
    };

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.playgroundWorkspaceModel
      .countDocuments(filter)
      .exec();

    const items = await this.playgroundWorkspaceModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<PlaygroundWorkspaceEntity[]>()
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
