import type { SprintEntity } from '../entities/sprint.entity';

export const PLANNING_SPRINTS_REPOSITORY = 'PLANNING_SPRINTS_REPOSITORY';

export interface SprintsRepository {
  insert(sprint: SprintEntity): Promise<void>;
  update(sprint: SprintEntity): Promise<void>;
  findById(
    sprintId: string,
    workspaceId: string,
  ): Promise<SprintEntity | undefined>;
  listByWorkspace(workspaceId: string): Promise<SprintEntity[]>;
  queryByWorkspace?: (
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      initiativeId?: string;
      status?: string;
      squad?: string;
      search?: string;
    },
  ) => Promise<{ items: SprintEntity[]; total: number }>;
}
