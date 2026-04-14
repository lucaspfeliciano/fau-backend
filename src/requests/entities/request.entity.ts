import { RequestSourceType } from './request-source-type.enum';
import { RequestStatus } from './request-status.enum';

export interface RequestStatusHistoryEntry {
  from: RequestStatus | null;
  to: RequestStatus;
  changedBy: string;
  changedAt: string;
}

export type RequestDeduplicationDecision =
  | 'created'
  | 'suggested'
  | 'auto_linked'
  | 'auto_merged'
  | 'manually_merged'
  | 'merge_reverted';

export interface RequestDeduplicationEvidenceEntry {
  recordedAt: string;
  recordedBy?: string;
  sourceType: RequestSourceType;
  sourceRef?: string;
  summary?: string;
  similarityScore?: number;
  linkedRequestId?: string;
  mergedRequestId?: string;
  decision: RequestDeduplicationDecision;
}

export interface RequestMergeHistoryEntry {
  mergeId: string;
  occurredAt: string;
  actorId?: string;
  mode: 'auto' | 'manual' | 'revert';
  sourceRequestId: string;
  targetRequestId: string;
  similarityScore?: number;
  reason?: string;
}

export interface RequestEntity {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  feedbackIds: string[];
  customerIds: string[];
  problems: string[];
  solutions: string[];
  product?: string;
  functionality?: string;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Legacy compatibility fields. They are not part of the Sprint 1 core model.
  organizationId?: string;
  boardId?: string;
  votes: number;
  tags: string[];
  companyIds: string[];
  sourceType: RequestSourceType;
  sourceRef?: string;
  ingestedAt?: string;
  publicSubmitterName?: string;
  publicSubmitterEmail?: string;
  mergedIntoRequestId?: string;
  mergedRequestIds?: string[];
  deduplicationEvidence?: RequestDeduplicationEvidenceEntry[];
  mergeHistory?: RequestMergeHistoryEntry[];
  statusHistory: RequestStatusHistoryEntry[];
  deletedAt?: string;
}
