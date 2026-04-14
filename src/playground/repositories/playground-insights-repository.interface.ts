import type { PlaygroundInsightType } from '../entities/playground-insight-type.enum';
import type { PlaygroundInsightEntity } from '../entities/playground-insight.entity';

export const PLAYGROUND_INSIGHTS_REPOSITORY = 'PLAYGROUND_INSIGHTS_REPOSITORY';

export interface PlaygroundInsightsRepository {
  insert(insight: PlaygroundInsightEntity): Promise<void>;
  update(insight: PlaygroundInsightEntity): Promise<void>;
  findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity | undefined>;
  delete(id: string, workspaceId: string): Promise<void>;
  deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void>;
  listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity[]>;
  queryByPlaygroundWorkspace?: (
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      type?: PlaygroundInsightType;
      pinnedOnly?: boolean;
      search?: string;
    },
  ) => Promise<{ items: PlaygroundInsightEntity[]; total: number }>;
}