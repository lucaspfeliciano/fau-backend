import type { PlaygroundAssetType } from '../entities/playground-asset-type.enum';
import type { PlaygroundAssetEntity } from '../entities/playground-asset.entity';

export const PLAYGROUND_ASSETS_REPOSITORY = 'PLAYGROUND_ASSETS_REPOSITORY';

export interface PlaygroundAssetsRepository {
  insert(asset: PlaygroundAssetEntity): Promise<void>;
  findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundAssetEntity | undefined>;
  delete(id: string, workspaceId: string): Promise<void>;
  deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void>;
  listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundAssetEntity[]>;
  queryByPlaygroundWorkspace?: (
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      type?: PlaygroundAssetType;
      search?: string;
    },
  ) => Promise<{ items: PlaygroundAssetEntity[]; total: number }>;
}
