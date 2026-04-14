export interface SprintEntity {
  id: string;
  workspaceId: string;
  initiativeId: string;
  name: string;
  status: string;
  eta?: string;
  squad?: string;
  externalLinearSprintId?: string;
}
