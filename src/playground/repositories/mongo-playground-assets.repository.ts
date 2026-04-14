import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PlaygroundAssetType } from '../entities/playground-asset-type.enum';
import type { PlaygroundAssetEntity } from '../entities/playground-asset.entity';
import type { PlaygroundAssetsRepository } from './playground-assets-repository.interface';
import { PlaygroundAssetModel } from './playground-asset.schema';

@Injectable()
export class MongoPlaygroundAssetsRepository implements PlaygroundAssetsRepository {
  constructor(
    @InjectModel(PlaygroundAssetModel.name)
    private readonly playgroundAssetModel: Model<PlaygroundAssetModel>,
  ) {}

  async insert(asset: PlaygroundAssetEntity): Promise<void> {
    await this.playgroundAssetModel.create(asset);
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundAssetEntity | undefined> {
    const doc = await this.playgroundAssetModel
      .findOne({ id, workspaceId })
      .select({ _id: 0 })
      .lean<PlaygroundAssetEntity>()
      .exec();

    return doc ?? undefined;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.playgroundAssetModel.deleteOne({ id, workspaceId }).exec();
  }

  async deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.playgroundAssetModel
      .deleteMany({ playgroundWorkspaceId, workspaceId })
      .exec();
  }

  async listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundAssetEntity[]> {
    return this.playgroundAssetModel
      .find({ playgroundWorkspaceId, workspaceId })
      .sort({ createdAt: -1 })
      .select({ _id: 0 })
      .lean<PlaygroundAssetEntity[]>()
      .exec();
  }

  async queryByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      type?: PlaygroundAssetType;
      search?: string;
    },
  ): Promise<{ items: PlaygroundAssetEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      playgroundWorkspaceId,
      workspaceId,
    };

    if (options.type) {
      filter.type = options.type;
    }

    if (options.search) {
      filter.name = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
    }

    const total = await this.playgroundAssetModel.countDocuments(filter).exec();

    const items = await this.playgroundAssetModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<PlaygroundAssetEntity[]>()
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
