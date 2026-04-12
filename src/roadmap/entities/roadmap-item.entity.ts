export enum RoadmapItemCategory {
  Request = 'request',
  Feature = 'feature',
  Task = 'task',
  Release = 'release',
}

export enum RoadmapEtaConfidence {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum RoadmapAudience {
  Cs = 'cs',
  Product = 'product',
  Engineering = 'engineering',
  Exec = 'exec',
  All = 'all',
}

export type RoadmapRiskLevel = 'low' | 'medium' | 'high';

export interface RoadmapScoreBreakdown {
  votes: number;
  revenue: number;
  churn: number;
  strategic: number;
  total: number;
  formula: string;
}

export interface RoadmapEta {
  date?: string;
  confidence: RoadmapEtaConfidence;
  source: string;
}

export interface RoadmapImpact {
  customers: number;
  strategicAccounts: number;
  revenueAtRisk: number;
}

export interface RoadmapTraceability {
  requestId?: string;
  featureId?: string;
  taskIds: string[];
  sprintId?: string;
  releaseId?: string;
}

export interface RoadmapItemEntity {
  id: string;
  requestId: string;
  title: string;
  post: string;
  board: string;
  category: RoadmapItemCategory;
  owner: string;
  status: string;
  tags: string[];
  score: number;
  scoreBreakdown: RoadmapScoreBreakdown;
  eta: RoadmapEta;
  impact: RoadmapImpact;
  riskLevel: RoadmapRiskLevel;
  traceability: RoadmapTraceability;
  updatedAt: string;
}
