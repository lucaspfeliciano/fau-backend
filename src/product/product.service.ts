import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { RequestStatus } from '../requests/entities/request-status.enum';
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

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FeatureTraceabilityResult {
  feature: FeatureEntity;
  requests: ReturnType<RequestsService['findOneById']>[];
  impactedCustomers: ReturnType<CustomersService['findOneById']>[];
  impactedCompanies: ReturnType<CompaniesService['findOneById']>[];
}

@Injectable()
export class ProductService {
  private readonly initiatives: InitiativeEntity[] = [];
  private readonly features: FeatureEntity[] = [];

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly requestsService: RequestsService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
  ) {}

  createInitiative(
    input: CreateInitiativeInput,
    actor: AuthenticatedUser,
  ): InitiativeEntity {
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

    this.initiatives.push(initiative);

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

  listInitiatives(
    query: QueryInitiativesInput,
    organizationId: string,
  ): PaginatedResult<InitiativeEntity> {
    const filtered = this.initiatives
      .filter((initiative) => initiative.organizationId === organizationId)
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

  updateInitiative(
    id: string,
    input: UpdateInitiativeInput,
    actor: AuthenticatedUser,
  ): InitiativeEntity {
    const initiative = this.findInitiativeById(id, actor.organizationId);
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

  createFeature(
    input: CreateFeatureInput,
    actor: AuthenticatedUser,
  ): FeatureEntity {
    const now = new Date().toISOString();
    const requestIds = this.uniqueValues(input.requestIds);
    const requests = requestIds.map((requestId) =>
      this.requestsService.findOneById(requestId, actor.organizationId),
    );

    let initiativeId: string | undefined;
    if (input.initiativeId) {
      const initiative = this.findInitiativeById(
        input.initiativeId,
        actor.organizationId,
      );
      initiativeId = initiative.id;
    }

    const priorityScore = this.calculatePriorityScore(requests);
    const isPriorityManual = input.priority !== undefined;
    const priority =
      input.priority !== undefined
        ? input.priority
        : this.mapScoreToPriority(priorityScore);
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

    this.features.push(feature);

    if (initiativeId) {
      this.attachFeatureToInitiative(
        initiativeId,
        feature.id,
        actor.organizationId,
      );
    }

    this.domainEventsService.publish({
      name: 'product.feature_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        featureId: feature.id,
        status: feature.status,
        priority: feature.priority,
        requestIds: feature.requestIds,
      },
    });

    return feature;
  }

  listFeatures(
    query: QueryFeaturesInput,
    organizationId: string,
  ): PaginatedResult<FeatureEntity> {
    const filtered = this.features
      .filter((feature) => feature.organizationId === organizationId)
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

  updateFeature(
    id: string,
    input: UpdateFeatureInput,
    actor: AuthenticatedUser,
  ): FeatureEntity {
    const feature = this.findFeatureById(id, actor.organizationId);
    const previousStatus = feature.status;

    if (input.title !== undefined) {
      feature.title = input.title;
    }

    if (input.description !== undefined) {
      feature.description = input.description;
    }

    if (input.requestIds !== undefined) {
      const requestIds = this.uniqueValues(input.requestIds);
      const requests = requestIds.map((requestId) =>
        this.requestsService.findOneById(requestId, actor.organizationId),
      );

      feature.requestIds = requestIds;
      feature.requestSources = this.extractRequestSources(requests);
      feature.priorityScore = this.calculatePriorityScore(requests);

      if (!feature.isPriorityManual) {
        feature.priority = this.mapScoreToPriority(feature.priorityScore);
      }
    }

    if (input.priority !== undefined) {
      feature.priority = input.priority;
      feature.isPriorityManual = true;
    }

    if (input.initiativeId !== undefined) {
      this.moveFeatureToInitiative(
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
        this.requestsService.propagateStatusFromFeature(
          feature.requestIds,
          propagatedStatus,
          actor,
          feature.id,
        );
      }
    }

    feature.updatedAt = new Date().toISOString();

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

  linkRequestToFeature(
    featureId: string,
    requestId: string,
    actor: AuthenticatedUser,
  ): FeatureEntity {
    const feature = this.findFeatureById(featureId, actor.organizationId);
    const request = this.requestsService.findOneById(
      requestId,
      actor.organizationId,
    );

    if (!feature.requestIds.includes(requestId)) {
      feature.requestIds.push(requestId);
      feature.requestSources = this.extractRequestSources(
        feature.requestIds.map((id) =>
          this.requestsService.findOneById(id, actor.organizationId),
        ),
      );
      feature.priorityScore = this.calculatePriorityScore(
        feature.requestIds.map((id) =>
          this.requestsService.findOneById(id, actor.organizationId),
        ),
      );

      if (!feature.isPriorityManual) {
        feature.priority = this.mapScoreToPriority(feature.priorityScore);
      }

      feature.updatedAt = new Date().toISOString();

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

  getFeatureTraceability(
    featureId: string,
    organizationId: string,
  ): FeatureTraceabilityResult {
    const feature = this.findFeatureById(featureId, organizationId);
    const requests = feature.requestIds
      .map((requestId) => {
        try {
          return this.requestsService.findOneById(requestId, organizationId);
        } catch {
          return undefined;
        }
      })
      .filter(
        (request): request is ReturnType<RequestsService['findOneById']> =>
          Boolean(request),
      );

    const customerIds = this.uniqueValues(
      requests.flatMap((request) => request.customerIds),
    );
    const companyIds = this.uniqueValues(
      requests.flatMap((request) => request.companyIds),
    );

    const impactedCustomers = customerIds
      .map((customerId) => {
        try {
          return this.customersService.findOneById(customerId, organizationId);
        } catch {
          return undefined;
        }
      })
      .filter(
        (customer): customer is ReturnType<CustomersService['findOneById']> =>
          Boolean(customer),
      );

    const impactedCompanies = companyIds
      .map((companyId) => {
        try {
          return this.companiesService.findOneById(companyId, organizationId);
        } catch {
          return undefined;
        }
      })
      .filter(
        (company): company is ReturnType<CompaniesService['findOneById']> =>
          Boolean(company),
      );

    return {
      feature,
      requests,
      impactedCustomers,
      impactedCompanies,
    };
  }

  private findInitiativeById(
    id: string,
    organizationId: string,
  ): InitiativeEntity {
    const initiative = this.initiatives.find(
      (item) => item.id === id && item.organizationId === organizationId,
    );

    if (!initiative) {
      throw new NotFoundException('Initiative not found.');
    }

    return initiative;
  }

  private findFeatureById(id: string, organizationId: string): FeatureEntity {
    const feature = this.features.find(
      (item) => item.id === id && item.organizationId === organizationId,
    );

    if (!feature) {
      throw new NotFoundException('Feature not found.');
    }

    return feature;
  }

  private attachFeatureToInitiative(
    initiativeId: string,
    featureId: string,
    organizationId: string,
  ): void {
    const initiative = this.findInitiativeById(initiativeId, organizationId);
    if (initiative.featureIds.includes(featureId)) {
      return;
    }

    initiative.featureIds.push(featureId);
    initiative.updatedAt = new Date().toISOString();
  }

  private detachFeatureFromInitiative(
    initiativeId: string,
    featureId: string,
    organizationId: string,
  ): void {
    const initiative = this.findInitiativeById(initiativeId, organizationId);
    const previousSize = initiative.featureIds.length;
    initiative.featureIds = initiative.featureIds.filter(
      (id) => id !== featureId,
    );

    if (initiative.featureIds.length !== previousSize) {
      initiative.updatedAt = new Date().toISOString();
    }
  }

  private moveFeatureToInitiative(
    feature: FeatureEntity,
    nextInitiativeId: string | null,
    organizationId: string,
  ): void {
    const previousInitiativeId = feature.initiativeId;

    if (nextInitiativeId === null) {
      if (previousInitiativeId) {
        this.detachFeatureFromInitiative(
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

    const nextInitiative = this.findInitiativeById(
      nextInitiativeId,
      organizationId,
    );

    if (previousInitiativeId) {
      this.detachFeatureFromInitiative(
        previousInitiativeId,
        feature.id,
        organizationId,
      );
    }

    feature.initiativeId = nextInitiative.id;
    this.attachFeatureToInitiative(
      nextInitiative.id,
      feature.id,
      organizationId,
    );
  }

  private calculatePriorityScore(
    requests: ReturnType<RequestsService['findOneById']>[],
  ): number {
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

  private mapScoreToPriority(score: number): ProductPriority {
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
    requests: ReturnType<RequestsService['findOneById']>[],
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
