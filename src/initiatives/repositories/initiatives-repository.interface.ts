import type { InitiativeEntity } from '../entities/initiative.entity';

export const PLANNING_INITIATIVES_REPOSITORY =
  'PLANNING_INITIATIVES_REPOSITORY';

export interface InitiativesRepository {
  insert(initiative: InitiativeEntity): Promise<void>;
  update(initiative: InitiativeEntity): Promise<void>;
  findById(
    initiativeId: string,
    workspaceId: string,
  ): Promise<InitiativeEntity | undefined>;
  listByWorkspace(workspaceId: string): Promise<InitiativeEntity[]>;
  queryByWorkspace?: (
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    },
  ) => Promise<{ items: InitiativeEntity[]; total: number }>;
}
