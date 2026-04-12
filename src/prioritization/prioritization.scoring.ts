import type { RequestEntity } from '../requests/entities/request.entity';
import type { FeatureEntity } from '../product/entities/feature.entity';
import type { PrioritizationWeightsEntity } from './entities/prioritization-weights.entity';
import type {
  PrioritizationScoreExplanation,
  ScoreFactorDetail,
} from './dto/score-explanation.dto';

function safeRatio(n: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, n / max));
}

function tagMatches(tags: string[], patterns: string[]): boolean {
  const lowered = new Set(tags.map((t) => t.toLowerCase()));
  return patterns.some((p) => lowered.has(p.toLowerCase()));
}

export function buildCompanyRevenueMap(
  companies: { id: string; revenue?: number }[],
): { map: Map<string, number>; maxRevenue: number } {
  const map = new Map<string, number>();
  let maxRevenue = 0;
  for (const c of companies) {
    const r = c.revenue ?? 0;
    map.set(c.id, r);
    if (r > maxRevenue) {
      maxRevenue = r;
    }
  }
  return { map, maxRevenue };
}

export interface RequestRawFactors {
  votes: number;
  revenueSum: number;
  tierMaxSingle: number;
  churnRisk: number;
  strategicTag: number;
}

export function computeRequestRawFactors(
  request: RequestEntity,
  companyRevenue: Map<string, number>,
  weights: PrioritizationWeightsEntity,
): RequestRawFactors {
  let revenueSum = 0;
  let tierMaxSingle = 0;
  for (const cid of request.companyIds) {
    const r = companyRevenue.get(cid) ?? 0;
    revenueSum += r;
    if (r > tierMaxSingle) {
      tierMaxSingle = r;
    }
  }

  const churnRisk = tagMatches(request.tags, weights.churnRiskTags) ? 1 : 0;
  const strategicTag = tagMatches(request.tags, weights.strategicTags) ? 1 : 0;

  return {
    votes: request.votes,
    revenueSum,
    tierMaxSingle,
    churnRisk,
    strategicTag,
  };
}

export function maxAcrossRequests(rows: RequestRawFactors[]): {
  maxVotes: number;
  maxRevenueSum: number;
  maxTierMaxSingle: number;
} {
  let maxVotes = 0;
  let maxRevenueSum = 0;
  let maxTierMaxSingle = 0;
  for (const row of rows) {
    if (row.votes > maxVotes) {
      maxVotes = row.votes;
    }
    if (row.revenueSum > maxRevenueSum) {
      maxRevenueSum = row.revenueSum;
    }
    if (row.tierMaxSingle > maxTierMaxSingle) {
      maxTierMaxSingle = row.tierMaxSingle;
    }
  }
  return {
    maxVotes: maxVotes > 0 ? maxVotes : 1,
    maxRevenueSum: maxRevenueSum > 0 ? maxRevenueSum : 1,
    maxTierMaxSingle: maxTierMaxSingle > 0 ? maxTierMaxSingle : 1,
  };
}

function factor(
  label: string,
  raw: number,
  normalized: number,
  weight: number,
): ScoreFactorDetail {
  return {
    label,
    raw,
    normalized,
    weight,
    weighted: normalized * weight,
  };
}

export function scoreRequest(
  requestId: string,
  raw: RequestRawFactors,
  caps: ReturnType<typeof maxAcrossRequests>,
  weights: PrioritizationWeightsEntity,
): PrioritizationScoreExplanation {
  const nv = safeRatio(raw.votes, caps.maxVotes);
  const nr = safeRatio(raw.revenueSum, caps.maxRevenueSum);
  const nt = safeRatio(raw.tierMaxSingle, caps.maxTierMaxSingle);
  const nc = raw.churnRisk;
  const ns = raw.strategicTag;

  const breakdown = {
    votes: factor(
      'Votes (normalized by org max)',
      raw.votes,
      nv,
      weights.wVotes,
    ),
    revenue: factor(
      'Linked company revenue (sum)',
      raw.revenueSum,
      nr,
      weights.wRevenue,
    ),
    tier: factor(
      'Largest linked account revenue',
      raw.tierMaxSingle,
      nt,
      weights.wTier,
    ),
    churnRisk: factor(
      'Churn / risk tags on request',
      raw.churnRisk,
      nc,
      weights.wChurn,
    ),
    strategicTag: factor(
      'Strategic tags on request',
      raw.strategicTag,
      ns,
      weights.wStrategicTag,
    ),
  };

  const score =
    breakdown.votes.weighted +
    breakdown.revenue.weighted +
    breakdown.tier.weighted +
    breakdown.churnRisk.weighted +
    breakdown.strategicTag.weighted;

  return {
    entityId: requestId,
    entityType: 'request',
    score,
    scorePercent: Math.round(score * 1000) / 10,
    breakdown,
    weights: {
      wVotes: weights.wVotes,
      wRevenue: weights.wRevenue,
      wTier: weights.wTier,
      wChurn: weights.wChurn,
      wStrategicTag: weights.wStrategicTag,
      strategicTags: weights.strategicTags,
      churnRiskTags: weights.churnRiskTags,
    },
  };
}

export interface FeatureRawFactors {
  votesAgg: number;
  revenueSumUnique: number;
  tierMaxSingle: number;
  churnRisk: number;
  strategicTag: number;
}

export function computeFeatureRawFactors(
  feature: FeatureEntity,
  requestsById: Map<string, RequestEntity>,
  companyRevenue: Map<string, number>,
  weights: PrioritizationWeightsEntity,
): FeatureRawFactors {
  const seenCompanies = new Set<string>();
  let revenueSumUnique = 0;
  let votesAgg = 0;
  let tierMaxSingle = 0;
  let churnRisk = 0;
  let strategicTag = 0;

  for (const rid of feature.requestIds) {
    const req = requestsById.get(rid);
    if (!req || req.deletedAt) {
      continue;
    }
    votesAgg += req.votes;
    if (tagMatches(req.tags, weights.churnRiskTags)) {
      churnRisk = 1;
    }
    if (tagMatches(req.tags, weights.strategicTags)) {
      strategicTag = 1;
    }
    for (const cid of req.companyIds) {
      if (seenCompanies.has(cid)) {
        continue;
      }
      seenCompanies.add(cid);
      const r = companyRevenue.get(cid) ?? 0;
      revenueSumUnique += r;
      if (r > tierMaxSingle) {
        tierMaxSingle = r;
      }
    }
  }

  return {
    votesAgg,
    revenueSumUnique,
    tierMaxSingle,
    churnRisk,
    strategicTag,
  };
}

export function maxAcrossFeatures(rows: FeatureRawFactors[]): {
  maxVotesAgg: number;
  maxRevenueSum: number;
  maxTierMaxSingle: number;
} {
  let maxVotesAgg = 0;
  let maxRevenueSum = 0;
  let maxTierMaxSingle = 0;
  for (const row of rows) {
    if (row.votesAgg > maxVotesAgg) {
      maxVotesAgg = row.votesAgg;
    }
    if (row.revenueSumUnique > maxRevenueSum) {
      maxRevenueSum = row.revenueSumUnique;
    }
    if (row.tierMaxSingle > maxTierMaxSingle) {
      maxTierMaxSingle = row.tierMaxSingle;
    }
  }
  return {
    maxVotesAgg: maxVotesAgg > 0 ? maxVotesAgg : 1,
    maxRevenueSum: maxRevenueSum > 0 ? maxRevenueSum : 1,
    maxTierMaxSingle: maxTierMaxSingle > 0 ? maxTierMaxSingle : 1,
  };
}

export function scoreFeature(
  featureId: string,
  raw: FeatureRawFactors,
  caps: ReturnType<typeof maxAcrossFeatures>,
  weights: PrioritizationWeightsEntity,
): PrioritizationScoreExplanation {
  const nv = safeRatio(raw.votesAgg, caps.maxVotesAgg);
  const nr = safeRatio(raw.revenueSumUnique, caps.maxRevenueSum);
  const nt = safeRatio(raw.tierMaxSingle, caps.maxTierMaxSingle);
  const nc = raw.churnRisk;
  const ns = raw.strategicTag;

  const breakdown = {
    votes: factor(
      'Aggregated votes from linked requests',
      raw.votesAgg,
      nv,
      weights.wVotes,
    ),
    revenue: factor(
      'Unique linked company revenue (deduped)',
      raw.revenueSumUnique,
      nr,
      weights.wRevenue,
    ),
    tier: factor(
      'Largest linked account revenue',
      raw.tierMaxSingle,
      nt,
      weights.wTier,
    ),
    churnRisk: factor(
      'Churn / risk tags on linked requests',
      raw.churnRisk,
      nc,
      weights.wChurn,
    ),
    strategicTag: factor(
      'Strategic tags on linked requests',
      raw.strategicTag,
      ns,
      weights.wStrategicTag,
    ),
  };

  const score =
    breakdown.votes.weighted +
    breakdown.revenue.weighted +
    breakdown.tier.weighted +
    breakdown.churnRisk.weighted +
    breakdown.strategicTag.weighted;

  return {
    entityId: featureId,
    entityType: 'feature',
    score,
    scorePercent: Math.round(score * 1000) / 10,
    breakdown,
    weights: {
      wVotes: weights.wVotes,
      wRevenue: weights.wRevenue,
      wTier: weights.wTier,
      wChurn: weights.wChurn,
      wStrategicTag: weights.wStrategicTag,
      strategicTags: weights.strategicTags,
      churnRiskTags: weights.churnRiskTags,
    },
  };
}
