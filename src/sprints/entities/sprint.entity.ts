import { SprintStatus } from './sprint-status.enum';

export interface SprintEntity {
  id: string;
  workspaceId: string;
  // Legacy compatibility field used during workspaceId migration.
  organizationId?: string;
  initiativeId: string;
  name: string;
  status: SprintStatus;
  eta?: string;
  squad?: string;
  externalLinearSprintId?: string;
}
