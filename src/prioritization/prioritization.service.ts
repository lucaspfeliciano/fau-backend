import { Injectable, NotFoundException } from '@nestjs/common';

import type { FeatureEntity } from '../product/entities/feature.entity';
import { FeaturesRepository } from '../product/repositories/features.repository';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestsService } from '../requests/requests.service';
import { CompaniesService } from '../companies/companies.service';
import type { QueryRankingInput } from './dto/query-ranking.schema';
import type {
  PrioritizationScoreExplanation,
  RankedFeatureItem,
  RankedRequestItem,
} from './dto/score-explanation.dto';
import type { UpdateWeightsInput } from './dto/update-weights.schema';
import {
  DEFAULT_PRIORITIZATION_WEIGHTS,
  type PrioritizationWeightsEntity,
} from './entities/prioritization-weights.entity';
import {
  buildCompanyRevenueMap,
  computeFeatureRawFactors,
  computeRequestRawFactors,
  maxAcrossFeatures,
  maxAcrossRequests,
  scoreFeature,
  scoreRequest,
} from './prioritization.scoring';
import { mapCompositePercentToProductPriority } from './priority-thresholds';
import { PrioritizationWeightsRepository } from './repositories/prioritization-weights.repository';

@Injectable()
export class PrioritizationService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly companiesService: CompaniesService,
    private readonly weightsRepository: PrioritizationWeightsRepository,
    private readonly featuresRepository: FeaturesRepository,
  ) {}

  async getWeights(
    organizationId: string,
  ): Promise<PrioritizationWeightsEntity> {
    return this.resolveWeights(organizationId);
  }

  async updateWeights(
    organizationId: string,
    input: UpdateWeightsInput,
  ): Promise<PrioritizationWeightsEntity> {
    const now = new Date().toISOString();
    const entity: PrioritizationWeightsEntity = {
      organizationId,
      wVotes: input.wVotes,
      wRevenue: input.wRevenue,
      wTier: input.wTier,
      wChurn: input.wChurn,
      wStrategicTag: input.wStrategicTag,
      strategicTags: input.strategicTags,
      churnRiskTags: input.churnRiskTags,
      updatedAt: now,
    };
    await this.weightsRepository.upsert(entity);
    return entity;
  }

  /**
   * Recomputes composite scores for all non-manual features in the org and persists
   * `priorityScore` (0–100) and derived `priority` on each feature document.
   */
  async syncAutomaticFeatureScores(organizationId: string): Promise<void> {
    const weights = await this.resolveWeights(organizationId);
    const features = await this.loadFeatures(organizationId);
    if (features.length === 0) {
      return;
    }

    const requests = await this.loadRequests(organizationId);
    const requestsById = new Map(requests.map((r) => [r.id, r]));
    const { map: companyRevenue } = await this.loadCompaniesMap(organizationId);

    const rawList = features.map((f) =>
      computeFeatureRawFactors(f, requestsById, companyRevenue, weights),
    );
    const caps = maxAcrossFeatures(rawList);

    for (let i = 0; i < features.length; i++) {
      const feat = features[i]!;
      if (feat.isPriorityManual) {
        continue;
      }

      const explanation = scoreFeature(feat.id, rawList[i]!, caps, weights);
      const nextScore = explanation.scorePercent;
      const nextPriority = mapCompositePercentToProductPriority(nextScore);

      if (feat.priorityScore === nextScore && feat.priority === nextPriority) {
        continue;
      }

      feat.priorityScore = nextScore;
      feat.priority = nextPriority;
      await this.featuresRepository.update(feat);
    }
  }

  async rankRequests(
    organizationId: string,
    query: QueryRankingInput,
  ): Promise<{
    items: RankedRequestItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const weights = await this.resolveWeights(organizationId);
    const requests = await this.loadRequests(organizationId);
    const { map: companyRevenue } = await this.loadCompaniesMap(organizationId);

    const rawList = requests.map((r) =>
      computeRequestRawFactors(r, companyRevenue, weights),
    );
    const caps = maxAcrossRequests(rawList);

    const ranked: RankedRequestItem[] = requests.map((req, i) => {
      const explanation = scoreRequest(req.id, rawList[i], caps, weights);
      return {
        ...explanation,
        title: req.title,
        status: req.status,
      };
    });

    ranked.sort((a, b) =>
      query.sortOrder === 'desc' ? b.score - a.score : a.score - b.score,
    );

    const total = ranked.length;
    const start = (query.page - 1) * query.limit;
    const pageItems = ranked.slice(start, start + query.limit);

    return {
      items: pageItems,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async rankFeatures(
    organizationId: string,
    query: QueryRankingInput,
  ): Promise<{
    items: RankedFeatureItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const weights = await this.resolveWeights(organizationId);
    const features = await this.loadFeatures(organizationId);
    const requests = await this.loadRequests(organizationId);
    const requestsById = new Map(requests.map((r) => [r.id, r]));
    const { map: companyRevenue } = await this.loadCompaniesMap(organizationId);

    const rawList = features.map((f) =>
      computeFeatureRawFactors(f, requestsById, companyRevenue, weights),
    );
    const caps = maxAcrossFeatures(rawList);

    const ranked: RankedFeatureItem[] = features.map((feat, i) => {
      const explanation = scoreFeature(feat.id, rawList[i], caps, weights);
      return {
        ...explanation,
        title: feat.title,
        status: feat.status,
      };
    });

    ranked.sort((a, b) =>
      query.sortOrder === 'desc' ? b.score - a.score : a.score - b.score,
    );

    const total = ranked.length;
    const start = (query.page - 1) * query.limit;
    const pageItems = ranked.slice(start, start + query.limit);

    return {
      items: pageItems,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }

  async getScore(
    organizationId: string,
    entityType: 'requests' | 'features',
    id: string,
  ): Promise<PrioritizationScoreExplanation> {
    const weights = await this.resolveWeights(organizationId);
    const { map: companyRevenue } = await this.loadCompaniesMap(organizationId);

    if (entityType === 'requests') {
      const requests = await this.loadRequests(organizationId);
      const request = requests.find((r) => r.id === id);
      if (!request) {
        throw new NotFoundException('Request not found.');
      }

      const rawList = requests.map((r) =>
        computeRequestRawFactors(r, companyRevenue, weights),
      );
      const caps = maxAcrossRequests(rawList);
      const idx = requests.findIndex((r) => r.id === id);
      return scoreRequest(request.id, rawList[idx], caps, weights);
    }

    const features = await this.loadFeatures(organizationId);
    const requests = await this.loadRequests(organizationId);
    const requestsById = new Map(requests.map((r) => [r.id, r]));
    const feature = features.find((f) => f.id === id);
    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    const rawList = features.map((f) =>
      computeFeatureRawFactors(f, requestsById, companyRevenue, weights),
    );
    const caps = maxAcrossFeatures(rawList);
    const idx = features.findIndex((f) => f.id === id);
    return scoreFeature(feature.id, rawList[idx], caps, weights);
  }

  private async resolveWeights(
    organizationId: string,
  ): Promise<PrioritizationWeightsEntity> {
    const stored =
      await this.weightsRepository.findByOrganizationId(organizationId);
    const now = new Date().toISOString();
    if (!stored) {
      return {
        organizationId,
        ...DEFAULT_PRIORITIZATION_WEIGHTS,
        updatedAt: now,
      };
    }
    return stored;
  }

  private async loadRequests(organizationId: string): Promise<RequestEntity[]> {
    const items: RequestEntity[] = [];
    let page = 1;
    while (true) {
      const res = await this.requestsService.list(
        {
          page,
          limit: 100,
          includeArchived: false,
        },
        organizationId,
      );
      items.push(...res.items);
      if (res.items.length < 100 || page >= res.totalPages) {
        break;
      }
      page += 1;
    }
    return items;
  }

  private async loadFeatures(organizationId: string): Promise<FeatureEntity[]> {
    return this.featuresRepository.listByOrganization(organizationId);
  }

  private async loadCompaniesMap(organizationId: string) {
    const companies: { id: string; revenue?: number }[] = [];
    let page = 1;
    while (true) {
      const res = await this.companiesService.list(
        { page, limit: 100 },
        organizationId,
      );
      companies.push(...res.items);
      if (res.items.length < 100 || page >= res.totalPages) {
        break;
      }
      page += 1;
    }
    return buildCompanyRevenueMap(companies);
  }
}
