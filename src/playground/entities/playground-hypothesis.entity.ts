import { PlaygroundHypothesisStatus } from './playground-hypothesis-status.enum';

export interface PlaygroundHypothesisEntity {
  id: string;
  playgroundWorkspaceId: string;
  workspaceId: string;
  statement: string;
  description?: string;
  status: PlaygroundHypothesisStatus;
  confidence: number;
  evidenceAssetIds: string[];
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}