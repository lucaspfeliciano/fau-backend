import { RequestSourceType } from './request-source-type.enum';
import { RequestStatus } from './request-status.enum';

export interface RequestStatusHistoryEntry {
  from: RequestStatus | null;
  to: RequestStatus;
  changedBy: string;
  changedAt: string;
}

export interface RequestEntity {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  votes: number;
  tags: string[];
  createdBy: string;
  organizationId: string;
  customerIds: string[];
  companyIds: string[];
  sourceType: RequestSourceType;
  sourceRef?: string;
  ingestedAt?: string;
  statusHistory: RequestStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
