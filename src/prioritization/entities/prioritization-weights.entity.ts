export interface PrioritizationWeightsEntity {
  organizationId: string;
  wVotes: number;
  wRevenue: number;
  wTier: number;
  wChurn: number;
  wStrategicTag: number;
  strategicTags: string[];
  churnRiskTags: string[];
  updatedAt: string;
}

export const DEFAULT_PRIORITIZATION_WEIGHTS: Omit<
  PrioritizationWeightsEntity,
  'organizationId' | 'updatedAt'
> = {
  wVotes: 0.25,
  wRevenue: 0.25,
  wTier: 0.15,
  wChurn: 0.15,
  wStrategicTag: 0.2,
  strategicTags: ['enterprise', 'strategic', 'vip'],
  churnRiskTags: ['churn', 'at-risk', 'escalation'],
};
