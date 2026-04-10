import { InitiativeStatus } from './initiative-status.enum';
import { ProductPriority } from './product-priority.enum';

export interface InitiativeStatusHistoryEntry {
  from: InitiativeStatus | null;
  to: InitiativeStatus;
  changedBy: string;
  changedAt: string;
}

export interface InitiativeEntity {
  id: string;
  title: string;
  description: string;
  status: InitiativeStatus;
  priority: ProductPriority;
  organizationId: string;
  createdBy: string;
  featureIds: string[];
  statusHistory: InitiativeStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}
