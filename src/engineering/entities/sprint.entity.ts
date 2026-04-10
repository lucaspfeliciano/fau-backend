import { SprintStatus } from './sprint-status.enum';

export interface SprintStatusHistoryEntry {
  from: SprintStatus | null;
  to: SprintStatus;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface SprintEntity {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  closeReason?: string;
  organizationId: string;
  createdBy: string;
  statusHistory: SprintStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
