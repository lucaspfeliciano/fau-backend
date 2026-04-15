import { InitiativeStatus } from './initiative-status.enum';

export interface InitiativeEntity {
  id: string;
  workspaceId: string;
  // Legacy compatibility field used during workspaceId migration.
  organizationId?: string;
  title: string;
  description: string;
  requestIds: string[];
  status: InitiativeStatus;
  priorityNotes?: string;
}
