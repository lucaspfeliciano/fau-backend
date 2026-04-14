import type { PlaygroundWorkspaceEntity } from '../entities/playground-workspace.entity';

export const PLAYGROUND_WORKSPACES_REPOSITORY =
  'PLAYGROUND_WORKSPACES_REPOSITORY';

export interface PlaygroundWorkspacesRepository {
  insert(workspace: PlaygroundWorkspaceEntity): Promise<void>;
  update(workspace: PlaygroundWorkspaceEntity): Promise<void>;
  findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundWorkspaceEntity | undefined>;
  delete(id: string, workspaceId: string): Promise<void>;
  listByWorkspace(workspaceId: string): Promise<PlaygroundWorkspaceEntity[]>;
  queryByWorkspace?: (
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
    },
  ) => Promise<{ items: PlaygroundWorkspaceEntity[]; total: number }>;
}
