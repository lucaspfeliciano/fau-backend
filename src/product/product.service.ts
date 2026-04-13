import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestStatus } from '../requests/entities/request-status.enum';
import { PrioritizationService } from '../prioritization/prioritization.service';
import { RequestsService } from '../requests/requests.service';
import type { CreateFeatureInput } from './dto/create-feature.schema';
import type { CreateInitiativeInput } from './dto/create-initiative.schema';
import type { QueryFeaturesInput } from './dto/query-features.schema';
import type { QueryInitiativesInput } from './dto/query-initiatives.schema';
import type { UpdateFeatureInput } from './dto/update-feature.schema';
import type { UpdateInitiativeInput } from './dto/update-initiative.schema';
import { FeatureStatus } from './entities/feature-status.enum';
import type {
  FeatureEntity,
  FeatureRequestSource,
} from './entities/feature.entity';
import { InitiativeStatus } from './entities/initiative-status.enum';
import type { InitiativeEntity } from './entities/initiative.entity';
import { ProductPriority } from './entities/product-priority.enum';
import { FeaturesRepository } from './repositories/features.repository';
import { InitiativesRepository } from './repositories/initiatives.repository';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FeatureTraceabilityResult {
  feature: FeatureEntity;
  requests: RequestEntity[];
  impactedCustomers: Awaited<ReturnType<CustomersService['findOneById']>>[];
  impactedCompanies: Awaited<ReturnType<CompaniesService['findOneById']>>[];
}

@Injectable()
export class ProductService {
  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly requestsService: RequestsService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
    private readonly initiativesRepository: InitiativesRepository,
    private readonly featuresRepository: FeaturesRepository,
    @Optional() private readonly prioritizationService?: PrioritizationService,
  ) {}

  async createInitiative(
    input: CreateInitiativeInput,
    actor: AuthenticatedUser,
  ): Promise<InitiativeEntity> {
    const now = new Date().toISOString();
    const status = input.status ?? InitiativeStatus.Draft;
    const priority = input.priority ?? ProductPriority.Medium;

    const initiative: InitiativeEntity = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status,
      priority,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      featureIds: [],
      statusHistory: [
        {
          from: null,
          to: status,
          changedBy: actor.id,
          changedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.initiativesRepository.insert(initiative);

    this.domainEventsService.publish({
      name: 'product.initiative_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        initiativeId: initiative.id,
        status: initiative.status,
        priority: initiative.priority,
      },
    });

    return initiative;
  }

  async getInitiative(
    id: string,
    organizationId: string,
  ): Promise<InitiativeEntity> {
    return this.findInitiativeById(id, organizationId);
  }

  async getInitiativeFeatures(
    id: string,
    organizationId: string,
  ): Promise<FeatureEntity[]> {
    const initiative = await this.findInitiativeById(id, organizationId);
    return this.featuresRepository.findByIds(
      initiative.featureIds,
      organizationId,
    );
  }

  async listInitiatives(
    query: QueryInitiativesInput,
    organizationId: string,
  ): Promise<PaginatedResult<InitiativeEntity>> {
    if (typeof this.initiativesRepository.queryByOrganization === 'function') {
      const result = await this.initiativesRepository.queryByOrganization(
        organizationId,
        {
          page: query.page,
          limit: query.limit,
          status: query.status,
          priority: query.priority,
          search: query.search,
        },
      );

      return {
        items: result.items,
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages:
          result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
      };
    }

    const initiatives =
      await this.initiativesRepository.listByOrganization(organizationId);

    const filtered = initiatives
      .filter((initiative) => {
        if (!query.status) {
          return true;
        }

        return initiative.status === query.status;
      })
      .filter((initiative) => {
        if (!query.priority) {
          return true;
        }

        return initiative.priority === query.priority;
      })
      .filter((initiative) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          initiative.title.toLowerCase().includes(search) ||
          initiative.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, query.page, query.limit);
  }

  async updateInitiative(
    id: string,
    input: UpdateInitiativeInput,
    actor: AuthenticatedUser,
  ): Promise<InitiativeEntity> {
    const initiative = await this.findInitiativeById(id, actor.organizationId);
    const previousStatus = initiative.status;

    if (input.title !== undefined) {
      initiative.title = input.title;
    }

    if (input.description !== undefined) {
      initiative.description = input.description;
    }

    if (input.priority !== undefined) {
      initiative.priority = input.priority;
    }

    if (input.status !== undefined && input.status !== initiative.status) {
      initiative.status = input.status;
      initiative.statusHistory.push({
        from: previousStatus,
        to: input.status,
        changedBy: actor.id,
        changedAt: new Date().toISOString(),
      });

      this.domainEventsService.publish({
        name: 'product.initiative_status_changed',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          initiativeId: initiative.id,
          from: previousStatus,
          to: input.status,
        },
      });
    }

    initiative.updatedAt = new Date().toISOString();
    await this.initiativesRepository.update(initiative);

    this.domainEventsService.publish({
      name: 'product.initiative_updated',
      occurredAt: initiative.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        initiativeId: initiative.id,
      },
    });

    return initiative;
  }

  async createFeature(
    input: CreateFeatureInput,
    actor: AuthenticatedUser,
  ): Promise<FeatureEntity> {
    const now = new Date().toISOString();
    const requestIds = this.uniqueValues(input.requestIds);
    const requests = await Promise.all(
      requestIds.map((requestId) =>
        this.requestsService.findOneById(requestId, actor.organizationId),
      ),
    );

    let initiativeId: string | undefined;
    if (input.initiativeId) {
      const initiative = await this.findInitiativeById(
        input.initiativeId,
        actor.organizationId,
      );
      initiativeId = initiative.id;
    }

    const isPriorityManual = input.priority !== undefined;
    const priority =
      input.priority !== undefined ? input.priority : ProductPriority.Medium;
    const priorityScore = 0;
    const status = input.status ?? FeatureStatus.Discovery;

    const feature: FeatureEntity = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status,
      priority,
      priorityScore,
      isPriorityManual,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      initiativeId,
      requestIds,
      requestSources: this.extractRequestSources(requests),
      statusHistory: [
        {
          from: null,
          to: status,
          changedBy: actor.id,
          changedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.featuresRepository.insert(feature);

    if (this.prioritizationService) {
      await this.prioritizationService.syncAutomaticFeatureScores(
        actor.organizationId,
      );
    } else {
      feature.priorityScore = this.legacyCalculatePriorityScore(requests);
      if (!feature.isPriorityManual) {
        feature.priority = this.mapLegacyScoreToProductPriority(
          feature.priorityScore,
        );
      }
      await this.featuresRepository.update(feature);
    }

    if (initiativeId) {
      await this.attachFeatureToInitiative(
        initiativeId,
        feature.id,
        actor.organizationId,
      );
    }

    const created = await this.findFeatureByIdOrFail(
      feature.id,
      actor.organizationId,
    );

    this.domainEventsService.publish({
      name: 'product.feature_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        featureId: created.id,
        status: created.status,
        priority: created.priority,
        requestIds: created.requestIds,
      },
    });

    return created;
  }

  async listFeatures(
    query: QueryFeaturesInput,
    organizationId: string,
  ): Promise<PaginatedResult<FeatureEntity>> {
    if (typeof this.featuresRepository.queryByOrganization === 'function') {
      const result = await this.featuresRepository.queryByOrganization(
        organizationId,
        {
          page: query.page,
          limit: query.limit,
          status: query.status,
          priority: query.priority,
          initiativeId: query.initiativeId,
          search: query.search,
        },
      );

      return {
        items: result.items,
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages:
          result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
      };
    }

    const features =
      await this.featuresRepository.listByOrganization(organizationId);

    const filtered = features
      .filter((feature) => {
        if (!query.status) {
          return true;
        }

        return feature.status === query.status;
      })
      .filter((feature) => {
        if (!query.priority) {
          return true;
        }

        return feature.priority === query.priority;
      })
      .filter((feature) => {
        if (!query.initiativeId) {
          return true;
        }

        return feature.initiativeId === query.initiativeId;
      })
      .filter((feature) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          feature.title.toLowerCase().includes(search) ||
          feature.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, query.page, query.limit);
  }

  async updateFeature(
    id: string,
    input: UpdateFeatureInput,
    actor: AuthenticatedUser,
  ): Promise<FeatureEntity> {
    const feature = await this.findFeatureByIdOrFail(id, actor.organizationId);
    const previousStatus = feature.status;

    if (input.title !== undefined) {
      feature.title = input.title;
    }

    if (input.description !== undefined) {
      feature.description = input.description;
    }

    if (input.requestIds !== undefined) {
      const requestIds = this.uniqueValues(input.requestIds);
      const requests = await Promise.all(
        requestIds.map((requestId) =>
          this.requestsService.findOneById(requestId, actor.organizationId),
        ),
      );

      feature.requestIds = requestIds;
      feature.requestSources = this.extractRequestSources(requests);

      if (!this.prioritizationService) {
        feature.priorityScore = this.legacyCalculatePriorityScore(requests);

        if (!feature.isPriorityManual) {
          feature.priority = this.mapLegacyScoreToProductPriority(
            feature.priorityScore,
          );
        }
      }
    }

    if (input.priority !== undefined) {
      feature.priority = input.priority;
      feature.isPriorityManual = true;
    }

    if (input.initiativeId !== undefined) {
      await this.moveFeatureToInitiative(
        feature,
        input.initiativeId,
        actor.organizationId,
      );
    }

    if (input.status !== undefined && input.status !== feature.status) {
      feature.status = input.status;
      const statusChangedAt = new Date().toISOString();
      feature.statusHistory.push({
        from: previousStatus,
        to: input.status,
        changedBy: actor.id,
        changedAt: statusChangedAt,
      });

      this.domainEventsService.publish({
        name: 'product.feature_status_changed',
        occurredAt: statusChangedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          featureId: feature.id,
          from: previousStatus,
          to: input.status,
        },
      });

      const propagatedStatus = this.mapFeatureStatusToRequestStatus(
        input.status,
      );
      if (propagatedStatus && feature.requestIds.length > 0) {
        await this.requestsService.propagateStatusFromFeature(
          feature.requestIds,
          propagatedStatus,
          actor,
          feature.id,
        );
      }
    }

    feature.updatedAt = new Date().toISOString();
    await this.featuresRepository.update(feature);

    if (this.prioritizationService && input.requestIds !== undefined) {
      await this.prioritizationService.syncAutomaticFeatureScores(
        actor.organizationId,
      );
    }

    this.domainEventsService.publish({
      name: 'product.feature_updated',
      occurredAt: feature.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        featureId: feature.id,
      },
    });

    return feature;
  }

  async linkRequestToFeature(
    featureId: string,
    requestId: string,
    actor: AuthenticatedUser,
  ): Promise<FeatureEntity> {
    const feature = await this.findFeatureByIdOrFail(
      featureId,
      actor.organizationId,
    );
    const request = await this.requestsService.findOneById(
      requestId,
      actor.organizationId,
    );

    if (!feature.requestIds.includes(requestId)) {
      feature.requestIds.push(requestId);
      const linkedRequests = await Promise.all(
        feature.requestIds.map((id) =>
          this.requestsService.findOneById(id, actor.organizationId),
        ),
      );
      feature.requestSources = this.extractRequestSources(linkedRequests);

      if (!this.prioritizationService) {
        feature.priorityScore =
          this.legacyCalculatePriorityScore(linkedRequests);

        if (!feature.isPriorityManual) {
          feature.priority = this.mapLegacyScoreToProductPriority(
            feature.priorityScore,
          );
        }
      }

      feature.updatedAt = new Date().toISOString();
      await this.featuresRepository.update(feature);

      if (this.prioritizationService) {
        await this.prioritizationService.syncAutomaticFeatureScores(
          actor.organizationId,
        );
      }

      this.domainEventsService.publish({
        name: 'product.feature_request_linked',
        occurredAt: feature.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          featureId: feature.id,
          requestId: request.id,
          sourceType: request.sourceType,
        },
      });
    }

    return feature;
  }

  async getFeatureTraceability(
    featureId: string,
    organizationId: string,
  ): Promise<FeatureTraceabilityResult> {
    const feature = await this.findFeatureByIdOrFail(featureId, organizationId);
    const requests = (
      await Promise.all(
        feature.requestIds.map(async (requestId) => {
          try {
            return await this.requestsService.findOneById(
              requestId,
              organizationId,
            );
          } catch {
            return undefined;
          }
        }),
      )
    ).filter((request): request is RequestEntity => Boolean(request));

    const customerIds = this.uniqueValues(
      requests.flatMap((request) => request.customerIds),
    );
    const companyIds = this.uniqueValues(
      requests.flatMap((request) => request.companyIds),
    );

    const impactedCustomers = (
      await Promise.all(
        customerIds.map(async (customerId) => {
          try {
            return await this.customersService.findOneById(
              customerId,
              organizationId,
            );
          } catch {
            return undefined;
          }
        }),
      )
    ).filter(
      (
        customer,
      ): customer is Awaited<ReturnType<CustomersService['findOneById']>> =>
        Boolean(customer),
    );

    const impactedCompanies = (
      await Promise.all(
        companyIds.map(async (companyId) => {
          try {
            return await this.companiesService.findOneById(
              companyId,
              organizationId,
            );
          } catch {
            return undefined;
          }
        }),
      )
    ).filter(
      (
        company,
      ): company is Awaited<ReturnType<CompaniesService['findOneById']>> =>
        Boolean(company),
    );

    return {
      feature,
      requests,
      impactedCustomers,
      impactedCompanies,
    };
  }

  async findFeatureById(
    featureId: string,
    organizationId: string,
  ): Promise<FeatureEntity> {
    return this.findFeatureByIdOrFail(featureId, organizationId);
  }

  private async findInitiativeById(
    id: string,
    organizationId: string,
  ): Promise<InitiativeEntity> {
    const initiative = await this.initiativesRepository.findById(
      id,
      organizationId,
    );

    if (!initiative) {
      throw new NotFoundException('Initiative not found.');
    }

    return initiative;
  }

  private async findFeatureByIdOrFail(
    id: string,
    organizationId: string,
  ): Promise<FeatureEntity> {
    const feature = await this.featuresRepository.findById(id, organizationId);

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    return feature;
  }

  private async attachFeatureToInitiative(
    initiativeId: string,
    featureId: string,
    organizationId: string,
  ): Promise<void> {
    const initiative = await this.findInitiativeById(
      initiativeId,
      organizationId,
    );
    if (initiative.featureIds.includes(featureId)) {
      return;
    }

    initiative.featureIds.push(featureId);
    initiative.updatedAt = new Date().toISOString();
    await this.initiativesRepository.update(initiative);
  }

  private async detachFeatureFromInitiative(
    initiativeId: string,
    featureId: string,
    organizationId: string,
  ): Promise<void> {
    const initiative = await this.findInitiativeById(
      initiativeId,
      organizationId,
    );
    const previousSize = initiative.featureIds.length;
    initiative.featureIds = initiative.featureIds.filter(
      (id) => id !== featureId,
    );

    if (initiative.featureIds.length !== previousSize) {
      initiative.updatedAt = new Date().toISOString();
      await this.initiativesRepository.update(initiative);
    }
  }

  private async moveFeatureToInitiative(
    feature: FeatureEntity,
    nextInitiativeId: string | null,
    organizationId: string,
  ): Promise<void> {
    const previousInitiativeId = feature.initiativeId;

    if (nextInitiativeId === null) {
      if (previousInitiativeId) {
        await this.detachFeatureFromInitiative(
          previousInitiativeId,
          feature.id,
          organizationId,
        );
      }
      feature.initiativeId = undefined;
      return;
    }

    if (nextInitiativeId === previousInitiativeId) {
      return;
    }

    const nextInitiative = await this.findInitiativeById(
      nextInitiativeId,
      organizationId,
    );

    if (previousInitiativeId) {
      await this.detachFeatureFromInitiative(
        previousInitiativeId,
        feature.id,
        organizationId,
      );
    }

    feature.initiativeId = nextInitiative.id;
    await this.attachFeatureToInitiative(
      nextInitiative.id,
      feature.id,
      organizationId,
    );
  }

  /** @deprecated Prefer PrioritizationService; kept for unit tests without that module */
  private legacyCalculatePriorityScore(requests: RequestEntity[]): number {
    if (requests.length === 0) {
      return 0;
    }

    const strategicTags = new Set([
      'strategic',
      'revenue',
      'security',
      'enterprise',
      'compliance',
      'churn',
      'retention',
    ]);

    const votesScore = requests.reduce(
      (acc, request) => acc + request.votes * 2,
      0,
    );
    const customersImpact = new Set(
      requests.flatMap((request) => request.customerIds),
    ).size;
    const companiesImpact = new Set(
      requests.flatMap((request) => request.companyIds),
    ).size;
    const strategicTagHits = requests.reduce((acc, request) => {
      const currentHits = request.tags.filter((tag) =>
        strategicTags.has(tag.trim().toLowerCase()),
      ).length;
      return acc + currentHits;
    }, 0);

    return (
      votesScore +
      customersImpact * 3 +
      companiesImpact * 4 +
      strategicTagHits * 5
    );
  }

  private mapLegacyScoreToProductPriority(score: number): ProductPriority {
    if (score >= 50) {
      return ProductPriority.Critical;
    }

    if (score >= 30) {
      return ProductPriority.High;
    }

    if (score >= 12) {
      return ProductPriority.Medium;
    }

    return ProductPriority.Low;
  }

  private mapFeatureStatusToRequestStatus(
    featureStatus: FeatureStatus,
  ): RequestStatus | undefined {
    if (featureStatus === FeatureStatus.Planned) {
      return RequestStatus.Planned;
    }

    if (featureStatus === FeatureStatus.InProgress) {
      return RequestStatus.InProgress;
    }

    if (featureStatus === FeatureStatus.Done) {
      return RequestStatus.Completed;
    }

    return undefined;
  }

  private extractRequestSources(
    requests: RequestEntity[],
  ): FeatureRequestSource[] {
    return requests.map((request) => ({
      requestId: request.id,
      sourceType: request.sourceType,
      sourceRef: request.sourceRef,
      ingestedAt: request.ingestedAt,
    }));
  }

  private uniqueValues(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        continue;
      }

      const dedupeKey = normalizedValue.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      result.push(normalizedValue);
    }

    return result;
  }

  private paginate<T>(
    items: T[],
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const total = items.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      items: items.slice(offset, offset + limit),
      page,
      limit,
      total,
      totalPages,
    };
  }
}
