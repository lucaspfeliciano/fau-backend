import type { PlaygroundHypothesisStatus } from '../entities/playground-hypothesis-status.enum';
import type { PlaygroundHypothesisEntity } from '../entities/playground-hypothesis.entity';

export const PLAYGROUND_HYPOTHESES_REPOSITORY =
  'PLAYGROUND_HYPOTHESES_REPOSITORY';

export interface PlaygroundHypothesesRepository {
  insert(hypothesis: PlaygroundHypothesisEntity): Promise<void>;
  update(hypothesis: PlaygroundHypothesisEntity): Promise<void>;
  findById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity | undefined>;
  delete(id: string, workspaceId: string): Promise<void>;
  deleteByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<void>;
  listByPlaygroundWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity[]>;
  queryByPlaygroundWorkspace?: (
    playgroundWorkspaceId: string,
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      status?: PlaygroundHypothesisStatus;
      search?: string;
    },
  ) => Promise<{ items: PlaygroundHypothesisEntity[]; total: number }>;
}
