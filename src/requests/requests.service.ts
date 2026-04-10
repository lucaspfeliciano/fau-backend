import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestInput } from './dto/create-request.schema';
import type { QueryRequestsInput } from './dto/query-requests.schema';
import type { UpdateRequestInput } from './dto/update-request.schema';
import { RequestEntity } from './entities/request.entity';
import { RequestSourceType } from './entities/request-source-type.enum';
import { RequestStatus } from './entities/request-status.enum';

export interface PaginatedRequestsResult {
  items: RequestEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class RequestsService {
  private readonly requests: RequestEntity[] = [];

  constructor(private readonly domainEventsService: DomainEventsService) {}

  create(input: CreateRequestInput, actor: AuthenticatedUser): RequestEntity {
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

    this.requests.push(request);

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

  list(
    query: QueryRequestsInput,
    organizationId: string,
  ): PaginatedRequestsResult {
    const filtered = this.requests
      .filter((request) => request.organizationId === organizationId)
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

  findOneById(requestId: string, organizationId: string): RequestEntity {
    return this.findById(requestId, organizationId, false);
  }

  update(
    requestId: string,
    input: UpdateRequestInput,
    actor: AuthenticatedUser,
  ): RequestEntity {
    const request = this.findById(requestId, actor.organizationId, false);
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

  archive(requestId: string, actor: AuthenticatedUser): RequestEntity {
    const request = this.findById(requestId, actor.organizationId, false);
    const now = new Date().toISOString();

    request.deletedAt = now;
    request.updatedAt = now;

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

  vote(requestId: string, actor: AuthenticatedUser): RequestEntity {
    const request = this.findById(requestId, actor.organizationId, false);
    request.votes += 1;
    request.updatedAt = new Date().toISOString();

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

  private findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): RequestEntity {
    const request = this.requests.find((item) => {
      if (item.id !== requestId || item.organizationId !== organizationId) {
        return false;
      }

      if (!includeArchived && item.deletedAt) {
        return false;
      }

      return true;
    });

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
}
