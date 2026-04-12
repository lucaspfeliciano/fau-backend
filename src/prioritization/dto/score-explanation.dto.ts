import type { PrioritizationWeightsEntity } from '../entities/prioritization-weights.entity';

export interface ScoreFactorDetail {
  label: string;
  raw: number;
  normalized: number;
  weight: number;
  weighted: number;
}

export interface PrioritizationScoreExplanation {
  entityId: string;
  entityType: 'request' | 'feature';
  score: number;
  scorePercent: number;
  breakdown: {
    votes: ScoreFactorDetail;
    revenue: ScoreFactorDetail;
    tier: ScoreFactorDetail;
    churnRisk: ScoreFactorDetail;
    strategicTag: ScoreFactorDetail;
  };
  weights: Pick<
    PrioritizationWeightsEntity,
    | 'wVotes'
    | 'wRevenue'
    | 'wTier'
    | 'wChurn'
    | 'wStrategicTag'
    | 'strategicTags'
    | 'churnRiskTags'
  >;
}

export interface RankedRequestItem extends PrioritizationScoreExplanation {
  title: string;
  status: string;
}

export interface RankedFeatureItem extends PrioritizationScoreExplanation {
  title: string;
  status: string;
}
