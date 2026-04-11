import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompaniesService } from '../companies/companies.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { DomainEvent } from '../common/events/domain-event.interface';
import { CustomersService } from '../customers/customers.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestInput } from './dto/create-request.schema';
import type { QueryRequestsInput } from './dto/query-requests.schema';
import type { UpdateRequestInput } from './dto/update-request.schema';
import { RequestEntity } from './entities/request.entity';
import { RequestSourceType } from './entities/request-source-type.enum';
import { RequestStatus } from './entities/request-status.enum';
import {
  REQUESTS_REPOSITORY,
  type RequestsRepository,
} from './repositories/requests-repository.interface';

export interface PaginatedRequestsResult {
  items: RequestEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SimilarRequestMatch {
  request: RequestEntity;
  score: number;
}

export interface RequestUpdatesResult {
  request: RequestEntity;
  updates: DomainEvent[];
}

@Injectable()
export class RequestsService {
  constructor(
    @Inject(REQUESTS_REPOSITORY)
    private readonly requestsRepository: RequestsRepository,
    private readonly domainEventsService: DomainEventsService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
  ) {}

  async create(
    input: CreateRequestInput,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const now = new Date().toISOString();
    const status = input.status ?? RequestStatus.Backlog;
    const sourceType = input.sourceType ?? RequestSourceType.Manual;

    const request: RequestEntity = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status,
      votes: 1,
      tags: this.uniqueValues(input.tags),
      createdBy: actor.id,
      organizationId: actor.organizationId,
      customerIds: this.uniqueValues(input.customerIds),
      companyIds: this.uniqueValues(input.companyIds),
      sourceType,
      sourceRef: input.sourceRef,
      ingestedAt: sourceType === RequestSourceType.Manual ? undefined : now,
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

    await this.requestsRepository.insert(request);

    this.domainEventsService.publish({
      name: 'request.created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId: request.id,
        status: request.status,
        sourceType: request.sourceType,
      },
    });

    return request;
  }

  async list(
    query: QueryRequestsInput,
    organizationId: string,
  ): Promise<PaginatedRequestsResult> {
    const filtered = (
      await this.requestsRepository.listByOrganization(organizationId)
    )
      .filter((request) => {
        if (query.includeArchived) {
          return true;
        }

        return !request.deletedAt;
      })
      .filter((request) => {
        if (!query.status) {
          return true;
        }

        return request.status === query.status;
      })
      .filter((request) => {
        if (!query.tag) {
          return true;
        }

        const targetTag = query.tag.toLowerCase();
        return request.tags.some((tag) => tag.toLowerCase() === targetTag);
      })
      .filter((request) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          request.title.toLowerCase().includes(search) ||
          request.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page;
    const limit = query.limit;
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      items: filtered.slice(offset, offset + limit),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async findOneById(
    requestId: string,
    organizationId: string,
  ): Promise<RequestEntity> {
    return this.findById(requestId, organizationId, false);
  }

  async update(
    requestId: string,
    input: UpdateRequestInput,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    const previousStatus = request.status;

    if (input.title !== undefined) {
      request.title = input.title;
    }

    if (input.description !== undefined) {
      request.description = input.description;
    }

    if (input.tags !== undefined) {
      request.tags = this.uniqueValues(input.tags);
    }

    if (input.customerIds !== undefined) {
      request.customerIds = this.uniqueValues(input.customerIds);
    }

    if (input.companyIds !== undefined) {
      request.companyIds = this.uniqueValues(input.companyIds);
    }

    if (input.sourceType !== undefined) {
      request.sourceType = input.sourceType;
      if (
        !request.ingestedAt &&
        input.sourceType !== RequestSourceType.Manual
      ) {
        request.ingestedAt = new Date().toISOString();
      }
    }

    if (input.sourceRef !== undefined) {
      request.sourceRef = input.sourceRef;
    }

    if (input.status !== undefined && input.status !== request.status) {
      request.status = input.status;
      request.statusHistory.push({
        from: previousStatus,
        to: input.status,
        changedBy: actor.id,
        changedAt: new Date().toISOString(),
      });

      this.domainEventsService.publish({
        name: 'request.status_changed',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          from: previousStatus,
          to: input.status,
        },
      });
    }

    request.updatedAt = new Date().toISOString();
    await this.requestsRepository.update(request);

    this.domainEventsService.publish({
      name: 'request.updated',
      occurredAt: request.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId: request.id,
      },
    });

    return request;
  }

  async archive(
    requestId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    const now = new Date().toISOString();

    request.deletedAt = now;
    request.updatedAt = now;
    await this.requestsRepository.update(request);

    this.domainEventsService.publish({
      name: 'request.archived',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId: request.id,
      },
    });

    return request;
  }

  async vote(
    requestId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    request.votes += 1;
    request.updatedAt = new Date().toISOString();
    await this.requestsRepository.update(request);

    this.domainEventsService.publish({
      name: 'request.voted',
      occurredAt: request.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId: request.id,
        votes: request.votes,
      },
    });

    return request;
  }

  async linkCustomer(
    requestId: string,
    customerId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    await this.customersService.findOneById(customerId, actor.organizationId);

    if (!request.customerIds.includes(customerId)) {
      request.customerIds.push(customerId);
      request.updatedAt = new Date().toISOString();
      await this.requestsRepository.update(request);

      this.domainEventsService.publish({
        name: 'request.customer_linked',
        occurredAt: request.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          customerId,
        },
      });
    }

    return request;
  }

  async unlinkCustomer(
    requestId: string,
    customerId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    const previousLength = request.customerIds.length;
    request.customerIds = request.customerIds.filter((id) => id !== customerId);

    if (request.customerIds.length !== previousLength) {
      request.updatedAt = new Date().toISOString();
      await this.requestsRepository.update(request);

      this.domainEventsService.publish({
        name: 'request.customer_unlinked',
        occurredAt: request.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          customerId,
        },
      });
    }

    return request;
  }

  async linkCompany(
    requestId: string,
    companyId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    await this.companiesService.findOneById(companyId, actor.organizationId);

    if (!request.companyIds.includes(companyId)) {
      request.companyIds.push(companyId);
      request.updatedAt = new Date().toISOString();
      await this.requestsRepository.update(request);

      this.domainEventsService.publish({
        name: 'request.company_linked',
        occurredAt: request.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          companyId,
        },
      });
    }

    return request;
  }

  async unlinkCompany(
    requestId: string,
    companyId: string,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, actor.organizationId, false);
    const previousLength = request.companyIds.length;
    request.companyIds = request.companyIds.filter((id) => id !== companyId);

    if (request.companyIds.length !== previousLength) {
      request.updatedAt = new Date().toISOString();
      await this.requestsRepository.update(request);

      this.domainEventsService.publish({
        name: 'request.company_unlinked',
        occurredAt: request.updatedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          companyId,
        },
      });
    }

    return request;
  }

  async propagateStatusFromFeature(
    requestIds: string[],
    status: RequestStatus,
    actor: AuthenticatedUser,
    featureId: string,
  ): Promise<RequestEntity[]> {
    const updatedRequests: RequestEntity[] = [];
    const uniqueRequestIds = this.uniqueValues(requestIds);

    for (const requestId of uniqueRequestIds) {
      const request = await this.findById(
        requestId,
        actor.organizationId,
        false,
      );

      if (request.status === status) {
        updatedRequests.push(request);
        continue;
      }

      const previousStatus = request.status;
      request.status = status;
      const changedAt = new Date().toISOString();
      request.statusHistory.push({
        from: previousStatus,
        to: status,
        changedBy: actor.id,
        changedAt,
      });
      request.updatedAt = changedAt;
      await this.requestsRepository.update(request);

      this.domainEventsService.publish({
        name: 'request.status_changed',
        occurredAt: changedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
          from: previousStatus,
          to: status,
          sourceFeatureId: featureId,
          propagation: 'feature_status',
        },
      });

      this.domainEventsService.publish({
        name: 'request.updated',
        occurredAt: changedAt,
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: request.id,
        },
      });

      updatedRequests.push(request);
    }

    return updatedRequests;
  }

  async findMostSimilarByText(
    organizationId: string,
    rawText: string,
    threshold: number,
  ): Promise<SimilarRequestMatch | undefined> {
    const normalized = rawText.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    let bestMatch: SimilarRequestMatch | undefined;

    const organizationRequests = (
      await this.requestsRepository.listByOrganization(organizationId)
    ).filter((request) => !request.deletedAt);

    for (const request of organizationRequests) {
      const referenceText = `${request.title} ${request.description}`;
      const score = this.calculateTextSimilarity(normalized, referenceText);

      if (score < threshold) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          request,
          score,
        };
      }
    }

    return bestMatch;
  }

  async getRequestUpdates(
    requestId: string,
    organizationId: string,
  ): Promise<RequestUpdatesResult> {
    const request = await this.findOneById(requestId, organizationId);
    const updates = this.domainEventsService
      .list()
      .filter((event) => {
        if (event.organizationId !== organizationId) {
          return false;
        }

        const payload = event.payload as Record<string, unknown>;
        return payload.requestId === requestId;
      })
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    return {
      request,
      updates,
    };
  }

  private async findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): Promise<RequestEntity> {
    const request = await this.requestsRepository.findById(
      requestId,
      organizationId,
      includeArchived,
    );

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    return request;
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

  private calculateTextSimilarity(a: string, b: string): number {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

    const tokensA = new Set(normalize(a));
    const tokensB = new Set(normalize(b));

    if (tokensA.size === 0 || tokensB.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) {
        intersection += 1;
      }
    }

    const unionSize = new Set([...tokensA, ...tokensB]).size;
    return unionSize === 0 ? 0 : intersection / unionSize;
  }
}
