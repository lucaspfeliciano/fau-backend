import { PlaygroundInsightType } from './playground-insight-type.enum';

export interface PlaygroundInsightEntity {
  id: string;
  playgroundWorkspaceId: string;
  workspaceId: string;
  title: string;
  summary: string;
  type: PlaygroundInsightType;
  importance: number;
  isPinned: boolean;
  sortOrder: number;
  evidenceAssetIds: string[];
  relatedHypothesisIds: string[];
  requestIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}