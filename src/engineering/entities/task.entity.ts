import type { FeatureRequestSource } from '../../product/entities/feature.entity';
import { TaskStatus } from './task-status.enum';

export interface TaskStatusHistoryEntry {
  from: TaskStatus | null;
  to: TaskStatus;
  changedBy: string;
  changedAt: string;
}

export interface TaskEntity {
  id: string;
  title: string;
  description: string;
  featureId: string;
  sprintId?: string;
  status: TaskStatus;
  estimate?: number;
  requestSources: FeatureRequestSource[];
  organizationId: string;
  createdBy: string;
  statusHistory: TaskStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
