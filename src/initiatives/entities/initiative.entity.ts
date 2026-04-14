export interface InitiativeEntity {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  requestIds: string[];
  status: string;
  priorityNotes?: string;
}
