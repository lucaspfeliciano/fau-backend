import { RequestSourceType } from '../../requests/entities/request-source-type.enum';
import { FeatureStatus } from './feature-status.enum';
import { ProductPriority } from './product-priority.enum';

export interface FeatureStatusHistoryEntry {
  from: FeatureStatus | null;
  to: FeatureStatus;
  changedBy: string;
  changedAt: string;
}

export interface FeatureRequestSource {
  requestId: string;
  sourceType: RequestSourceType;
  sourceRef?: string;
  ingestedAt?: string;
}

export interface FeatureEntity {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: ProductPriority;
  priorityScore: number;
  isPriorityManual: boolean;
  organizationId: string;
  createdBy: string;
  initiativeId?: string;
  requestIds: string[];
  requestSources: FeatureRequestSource[];
  statusHistory: FeatureStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
