import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompaniesService } from '../companies/companies.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { DomainEvent } from '../common/events/domain-event.interface';
import { CustomersService } from '../customers/customers.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestCommentInput } from './dto/create-request-comment.schema';
import type { CreateRequestInput } from './dto/create-request.schema';
import type { FindSimilarRequestsInput } from './dto/find-similar-requests.schema';
import type { QueryRequestsInput } from './dto/query-requests.schema';
import type { UpdateRequestInput } from './dto/update-request.schema';
import type { RequestCommentEntity } from './entities/request-comment.entity';
import type {
  RequestDeduplicationDecision,
  RequestDeduplicationEvidenceEntry,
  RequestMergeHistoryEntry,
} from './entities/request.entity';
import { RequestEntity } from './entities/request.entity';
import { RequestSourceType } from './entities/request-source-type.enum';
import { RequestStatus } from './entities/request-status.enum';
import {
  REQUEST_COMMENTS_REPOSITORY,
  type RequestCommentsRepository,
} from './repositories/request-comments-repository.interface';
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

export interface SimilarRequestItem {
  requestId: string;
  title: string;
  similarityScore: number;
  actionSuggested: 'link_existing' | 'review';
}

export interface DeduplicationCandidate {
  requestId: string;
  title: string;
  similarityScore: number;
  actionSuggested: 'suggest_review' | 'auto_link' | 'auto_merge';
}

export interface IntelligentCreationResult {
  decision: 'created' | 'suggested' | 'auto_linked' | 'auto_merged';
  request: RequestEntity;
  candidates: DeduplicationCandidate[];
  mergedRequestId?: string;
}

export interface CreatePublicPortalRequestInput {
  title: string;
  description: string;
  boardId?: string;
  tags?: string[];
  publicSubmitterName: string;
  publicSubmitterEmail: string;
}

export interface CreatePublicPortalCommentInput {
  comment: string;
  publicAuthorName: string;
  publicAuthorEmail: string;
}

export interface DeduplicationMetricsResult {
  totalEvaluations: number;
  created: number;
  suggested: number;
  autoLinked: number;
  autoMerged: number;
  manualMerged: number;
  reversals: number;
  mergeRate: number;
  reversalRate: number;
  precisionApprox: number;
}

interface DeduplicationPolicy {
  suggestionThreshold: number;
  autoLinkThreshold: number;
  autoMergeThreshold: number;
  ambiguityDelta: number;
  maxCandidates: number;
}

interface DeduplicationMetrics {
  totalEvaluations: number;
  created: number;
  suggested: number;
  autoLinked: number;
  autoMerged: number;
  manualMerged: number;
  reversals: number;
}

const DEDUPLICATION_POLICY: DeduplicationPolicy = {
  suggestionThreshold: 0.35,
  autoLinkThreshold: 0.55,
  autoMergeThreshold: 0.78,
  ambiguityDelta: 0.06,
  maxCandidates: 8,
};

@Injectable()
export class RequestsService {
  private readonly inMemoryComments: RequestCommentEntity[] = [];
  private readonly deduplicationMetricsByOrganization = new Map<
    string,
    DeduplicationMetrics
  >();

  constructor(
    @Inject(REQUESTS_REPOSITORY)
    private readonly requestsRepository: RequestsRepository,
    @Optional()
    @Inject(REQUEST_COMMENTS_REPOSITORY)
    private readonly requestCommentsRepository:
      | RequestCommentsRepository
      | undefined,
    private readonly domainEventsService: DomainEventsService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
  ) {}

  async create(
    input: CreateRequestInput,
    actor: AuthenticatedUser,
  ): Promise<RequestEntity> {
    return this.createRaw(input, actor);
  }

  async createFromPublicPortal(
    input: CreatePublicPortalRequestInput,
    organizationId: string,
  ): Promise<RequestEntity> {
    const now = new Date().toISOString();
    const actorId = 'public-portal';
    const status = RequestStatus.Backlog;

    const request: RequestEntity = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      boardId: input.boardId,
      status,
      votes: 1,
      tags: this.uniqueValues(input.tags),
      createdBy: actorId,
      organizationId,
      customerIds: [],
      companyIds: [],
      sourceType: RequestSourceType.PublicPortal,
      sourceRef: 'public-portal',
      ingestedAt: now,
      publicSubmitterName: input.publicSubmitterName,
      publicSubmitterEmail: input.publicSubmitterEmail.trim().toLowerCase(),
      mergedRequestIds: [],
      deduplicationEvidence: [],
      mergeHistory: [],
      statusHistory: [
        {
          from: null,
          to: status,
          changedBy: actorId,
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
      actorId,
      organizationId,
      payload: {
        requestId: request.id,
        status: request.status,
        sourceType: request.sourceType,
      },
    });

    return request;
  }

  async createWithIntelligentDeduplication(
    input: CreateRequestInput,
    actor: AuthenticatedUser,
  ): Promise<IntelligentCreationResult> {
    const normalizedText = `${input.title} ${input.description}`
      .trim()
      .toLowerCase();

    const candidates = await this.collectDeduplicationCandidates(
      actor.organizationId,
      normalizedText,
      input.boardId,
    );

    this.bumpDeduplicationMetric(actor.organizationId, 'totalEvaluations');

    const topCandidate = candidates[0];
    const secondCandidate = candidates[1];
    const isAmbiguous =
      Boolean(topCandidate && secondCandidate) &&
      topCandidate.score - secondCandidate.score <
        DEDUPLICATION_POLICY.ambiguityDelta;

    if (
      topCandidate &&
      !isAmbiguous &&
      topCandidate.score >= DEDUPLICATION_POLICY.autoMergeThreshold
    ) {
      const created = await this.createRaw(input, actor);
      const merged = await this.mergeRequests(
        created.id,
        topCandidate.request.id,
        actor,
        'auto',
        topCandidate.score,
        'auto-merge threshold reached',
      );

      this.bumpDeduplicationMetric(actor.organizationId, 'autoMerged');
      await this.publishDeduplicationDecisionEvent(actor, {
        decision: 'auto_merged',
        sourceRequestId: created.id,
        targetRequestId: merged.id,
        similarityScore: topCandidate.score,
        candidatesCount: candidates.length,
      });

      return {
        decision: 'auto_merged',
        request: merged,
        mergedRequestId: created.id,
        candidates: this.toDeduplicationCandidates(candidates),
      };
    }

    if (
      topCandidate &&
      !isAmbiguous &&
      topCandidate.score >= DEDUPLICATION_POLICY.autoLinkThreshold
    ) {
      const linked = await this.applyAutoLink(
        topCandidate.request.id,
        input,
        actor,
        topCandidate.score,
      );

      this.bumpDeduplicationMetric(actor.organizationId, 'autoLinked');
      await this.publishDeduplicationDecisionEvent(actor, {
        decision: 'auto_linked',
        targetRequestId: linked.id,
        similarityScore: topCandidate.score,
        candidatesCount: candidates.length,
      });

      return {
        decision: 'auto_linked',
        request: linked,
        candidates: this.toDeduplicationCandidates(candidates),
      };
    }

    const created = await this.createRaw(input, actor);

    if (
      topCandidate &&
      topCandidate.score >= DEDUPLICATION_POLICY.suggestionThreshold
    ) {
      this.appendDeduplicationEvidence(created, {
        recordedAt: new Date().toISOString(),
        recordedBy: actor.id,
        sourceType: created.sourceType,
        sourceRef: created.sourceRef,
        summary: 'Potential duplicate suggested for manual review.',
        similarityScore: Number(topCandidate.score.toFixed(4)),
        linkedRequestId: topCandidate.request.id,
        decision: 'suggested',
      });
      created.updatedAt = new Date().toISOString();
      await this.requestsRepository.update(created);

      this.bumpDeduplicationMetric(actor.organizationId, 'suggested');
      await this.publishDeduplicationDecisionEvent(actor, {
        decision: 'suggested',
        sourceRequestId: created.id,
        targetRequestId: topCandidate.request.id,
        similarityScore: topCandidate.score,
        candidatesCount: candidates.length,
      });

      return {
        decision: 'suggested',
        request: created,
        candidates: this.toDeduplicationCandidates(candidates),
      };
    }

    this.bumpDeduplicationMetric(actor.organizationId, 'created');
    await this.publishDeduplicationDecisionEvent(actor, {
      decision: 'created',
      sourceRequestId: created.id,
      candidatesCount: candidates.length,
    });

    return {
      decision: 'created',
      request: created,
      candidates: this.toDeduplicationCandidates(candidates),
    };
  }

  private async createRaw(
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
      boardId: input.boardId,
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
      mergedRequestIds: [],
      deduplicationEvidence: [],
      mergeHistory: [],
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
    if (this.requestsRepository.queryByOrganization) {
      const result = await this.requestsRepository.queryByOrganization(
        organizationId,
        {
          page: query.page,
          limit: query.limit,
          includeArchived: query.includeArchived,
          status: query.status,
          boardId: query.boardId,
          tag: query.tag,
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
        if (!query.boardId) {
          return true;
        }

        return request.boardId === query.boardId;
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

    if (input.boardId !== undefined) {
      request.boardId = input.boardId ?? undefined;
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

  async findSimilarRequests(
    organizationId: string,
    input: FindSimilarRequestsInput,
  ): Promise<{ items: SimilarRequestItem[] }> {
    const normalized = `${input.title} ${input.details}`.trim().toLowerCase();
    if (!normalized) {
      return { items: [] };
    }

    const threshold = 0.2;
    const maxItems = 8;

    const candidates = (
      await this.requestsRepository.listByOrganization(organizationId)
    )
      .filter((request) => !request.deletedAt)
      .filter((request) => {
        if (!input.boardId) {
          return true;
        }

        return request.boardId === input.boardId;
      })
      .filter((request) => {
        if (!input.customerId) {
          return true;
        }

        return request.customerIds.includes(input.customerId);
      })
      .map((request) => {
        const referenceText = `${request.title} ${request.description}`;
        const score = this.calculateTextSimilarity(normalized, referenceText);
        return {
          request,
          score,
        };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems);

    return {
      items: candidates.map((item) => ({
        requestId: item.request.id,
        title: item.request.title,
        similarityScore: Number(item.score.toFixed(4)),
        actionSuggested: item.score >= 0.55 ? 'link_existing' : 'review',
      })),
    };
  }

  async manualMerge(
    sourceRequestId: string,
    targetRequestId: string,
    actor: AuthenticatedUser,
    reason?: string,
  ): Promise<RequestEntity> {
    const merged = await this.mergeRequests(
      sourceRequestId,
      targetRequestId,
      actor,
      'manual',
      undefined,
      reason,
    );

    this.bumpDeduplicationMetric(actor.organizationId, 'manualMerged');

    return merged;
  }

  async revertMerge(
    sourceRequestId: string,
    targetRequestId: string,
    actor: AuthenticatedUser,
    reason?: string,
  ): Promise<{ source: RequestEntity; target: RequestEntity }> {
    if (sourceRequestId === targetRequestId) {
      throw new BadRequestException('Source and target requests must differ.');
    }

    const source = await this.findById(
      sourceRequestId,
      actor.organizationId,
      true,
    );
    const target = await this.findById(
      targetRequestId,
      actor.organizationId,
      false,
    );

    if (source.mergedIntoRequestId !== target.id || !source.deletedAt) {
      throw new BadRequestException('Merge relation not found for reversal.');
    }

    const now = new Date().toISOString();
    const mergeId = randomUUID();

    target.mergedRequestIds = (target.mergedRequestIds ?? []).filter(
      (id) => id !== source.id,
    );
    target.votes = Math.max(1, target.votes - Math.max(1, source.votes));
    target.updatedAt = now;

    this.appendMergeHistory(target, {
      mergeId,
      occurredAt: now,
      actorId: actor.id,
      mode: 'revert',
      sourceRequestId: source.id,
      targetRequestId: target.id,
      reason,
    });

    this.appendDeduplicationEvidence(target, {
      recordedAt: now,
      recordedBy: actor.id,
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
      summary: reason ?? 'Manual merge reversal applied.',
      linkedRequestId: target.id,
      mergedRequestId: source.id,
      decision: 'merge_reverted',
    });

    source.mergedIntoRequestId = undefined;
    source.deletedAt = undefined;
    source.updatedAt = now;
    this.appendMergeHistory(source, {
      mergeId,
      occurredAt: now,
      actorId: actor.id,
      mode: 'revert',
      sourceRequestId: source.id,
      targetRequestId: target.id,
      reason,
    });

    await this.requestsRepository.update(target);
    await this.requestsRepository.update(source);

    this.bumpDeduplicationMetric(actor.organizationId, 'reversals');

    this.domainEventsService.publish({
      name: 'request.merge_reverted',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        sourceRequestId: source.id,
        targetRequestId: target.id,
        reason,
      },
    });

    return {
      source,
      target,
    };
  }

  getDeduplicationMetrics(organizationId: string): DeduplicationMetricsResult {
    const metrics = this.deduplicationMetricsByOrganization.get(
      organizationId,
    ) ?? {
      totalEvaluations: 0,
      created: 0,
      suggested: 0,
      autoLinked: 0,
      autoMerged: 0,
      manualMerged: 0,
      reversals: 0,
    };

    const totalMerges = metrics.autoMerged + metrics.manualMerged;
    const autoDecisions =
      metrics.autoLinked + metrics.autoMerged + metrics.manualMerged;

    const mergeRate =
      metrics.totalEvaluations === 0
        ? 0
        : Number((totalMerges / metrics.totalEvaluations).toFixed(4));
    const reversalRate =
      autoDecisions === 0
        ? 0
        : Number((metrics.reversals / autoDecisions).toFixed(4));
    const precisionApprox =
      autoDecisions === 0
        ? 0
        : Number(
            ((autoDecisions - metrics.reversals) / autoDecisions).toFixed(4),
          );

    return {
      ...metrics,
      mergeRate,
      reversalRate,
      precisionApprox,
    };
  }

  listDeduplicationAuditTrail(
    organizationId: string,
    limit = 50,
  ): DomainEvent[] {
    return this.domainEventsService
      .list()
      .filter((event) => event.organizationId === organizationId)
      .filter((event) =>
        [
          'request.deduplication_decision_made',
          'request.auto_link_applied',
          'request.merged',
          'request.merge_reverted',
        ].includes(event.name),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  }

  async addComment(
    requestId: string,
    input: CreateRequestCommentInput,
    actor: AuthenticatedUser,
  ): Promise<RequestCommentEntity> {
    await this.findById(requestId, actor.organizationId, false);

    const comment: RequestCommentEntity = {
      id: randomUUID(),
      requestId,
      organizationId: actor.organizationId,
      comment: input.comment,
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
    };

    await this.insertComment(comment);

    this.domainEventsService.publish({
      name: 'request.comment_added',
      occurredAt: comment.createdAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId,
        commentId: comment.id,
      },
    });

    return comment;
  }

  async addPublicComment(
    requestId: string,
    input: CreatePublicPortalCommentInput,
    organizationId: string,
  ): Promise<RequestCommentEntity> {
    await this.findById(requestId, organizationId, false);

    const actorId = 'public-portal';
    const comment: RequestCommentEntity = {
      id: randomUUID(),
      requestId,
      organizationId,
      comment: input.comment,
      createdBy: actorId,
      sourceType: RequestSourceType.PublicPortal,
      publicAuthorName: input.publicAuthorName,
      publicAuthorEmail: input.publicAuthorEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    await this.insertComment(comment);

    this.domainEventsService.publish({
      name: 'request.comment_added',
      occurredAt: comment.createdAt,
      actorId,
      organizationId,
      payload: {
        requestId,
        commentId: comment.id,
        sourceType: RequestSourceType.PublicPortal,
      },
    });

    return comment;
  }

  async listComments(
    requestId: string,
    organizationId: string,
  ): Promise<RequestCommentEntity[]> {
    await this.findById(requestId, organizationId, true);
    return this.readComments(requestId, organizationId);
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

  async voteFromPublicPortal(
    requestId: string,
    organizationId: string,
    actorId = 'public-portal',
  ): Promise<RequestEntity> {
    const request = await this.findById(requestId, organizationId, false);
    request.votes += 1;
    request.updatedAt = new Date().toISOString();
    await this.requestsRepository.update(request);

    this.domainEventsService.publish({
      name: 'request.voted',
      occurredAt: request.updatedAt,
      actorId,
      organizationId,
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

        const payload = event.payload;
        return (
          payload.requestId === requestId ||
          payload.sourceRequestId === requestId ||
          payload.targetRequestId === requestId
        );
      })
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    return {
      request,
      updates,
    };
  }

  private async collectDeduplicationCandidates(
    organizationId: string,
    normalizedText: string,
    boardId?: string,
  ): Promise<SimilarRequestMatch[]> {
    if (!normalizedText) {
      return [];
    }

    return (await this.requestsRepository.listByOrganization(organizationId))
      .filter((request) => !request.deletedAt)
      .filter((request) => {
        if (!boardId) {
          return true;
        }

        return request.boardId === boardId;
      })
      .map((request) => {
        const referenceText = `${request.title} ${request.description}`;
        const score = this.calculateTextSimilarity(
          normalizedText,
          referenceText,
        );

        return {
          request,
          score,
        };
      })
      .filter((item) => item.score >= DEDUPLICATION_POLICY.suggestionThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, DEDUPLICATION_POLICY.maxCandidates);
  }

  private toDeduplicationCandidates(
    matches: SimilarRequestMatch[],
  ): DeduplicationCandidate[] {
    return matches.map((item) => ({
      requestId: item.request.id,
      title: item.request.title,
      similarityScore: Number(item.score.toFixed(4)),
      actionSuggested:
        item.score >= DEDUPLICATION_POLICY.autoMergeThreshold
          ? 'auto_merge'
          : item.score >= DEDUPLICATION_POLICY.autoLinkThreshold
            ? 'auto_link'
            : 'suggest_review',
    }));
  }

  private async applyAutoLink(
    requestId: string,
    input: CreateRequestInput,
    actor: AuthenticatedUser,
    score: number,
  ): Promise<RequestEntity> {
    const linked = await this.vote(requestId, actor);

    linked.tags = this.uniqueValues([
      ...(linked.tags ?? []),
      ...(input.tags ?? []),
    ]);
    linked.customerIds = this.uniqueValues([
      ...(linked.customerIds ?? []),
      ...(input.customerIds ?? []),
    ]);
    linked.companyIds = this.uniqueValues([
      ...(linked.companyIds ?? []),
      ...(input.companyIds ?? []),
    ]);

    this.appendDeduplicationEvidence(linked, {
      recordedAt: new Date().toISOString(),
      recordedBy: actor.id,
      sourceType: input.sourceType ?? RequestSourceType.Manual,
      sourceRef: input.sourceRef,
      summary: `Auto-link applied from incoming request signal: ${input.title}`,
      similarityScore: Number(score.toFixed(4)),
      linkedRequestId: linked.id,
      decision: 'auto_linked',
    });

    linked.updatedAt = new Date().toISOString();
    await this.requestsRepository.update(linked);

    this.domainEventsService.publish({
      name: 'request.auto_link_applied',
      occurredAt: linked.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        requestId: linked.id,
        similarityScore: Number(score.toFixed(4)),
      },
    });

    return linked;
  }

  private async mergeRequests(
    sourceRequestId: string,
    targetRequestId: string,
    actor: AuthenticatedUser,
    mode: 'auto' | 'manual',
    similarityScore?: number,
    reason?: string,
  ): Promise<RequestEntity> {
    if (sourceRequestId === targetRequestId) {
      throw new BadRequestException('Source and target requests must differ.');
    }

    const source = await this.findById(
      sourceRequestId,
      actor.organizationId,
      false,
    );
    const target = await this.findById(
      targetRequestId,
      actor.organizationId,
      false,
    );

    if (source.mergedIntoRequestId) {
      throw new BadRequestException('Source request is already merged.');
    }

    const now = new Date().toISOString();
    const mergeId = randomUUID();

    target.votes += Math.max(1, source.votes);
    target.tags = this.uniqueValues([
      ...(target.tags ?? []),
      ...(source.tags ?? []),
    ]);
    target.customerIds = this.uniqueValues([
      ...(target.customerIds ?? []),
      ...(source.customerIds ?? []),
    ]);
    target.companyIds = this.uniqueValues([
      ...(target.companyIds ?? []),
      ...(source.companyIds ?? []),
    ]);
    target.mergedRequestIds = this.uniqueValues([
      ...(target.mergedRequestIds ?? []),
      ...(source.mergedRequestIds ?? []),
      source.id,
    ]);

    this.appendDeduplicationEvidence(target, {
      recordedAt: now,
      recordedBy: actor.id,
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
      summary: reason ?? 'Request merged into deduplicated target.',
      similarityScore: similarityScore
        ? Number(similarityScore.toFixed(4))
        : undefined,
      linkedRequestId: target.id,
      mergedRequestId: source.id,
      decision: mode === 'auto' ? 'auto_merged' : 'manually_merged',
    });

    this.appendMergeHistory(target, {
      mergeId,
      occurredAt: now,
      actorId: actor.id,
      mode,
      sourceRequestId: source.id,
      targetRequestId: target.id,
      similarityScore,
      reason,
    });

    source.mergedIntoRequestId = target.id;
    source.deletedAt = now;
    this.appendMergeHistory(source, {
      mergeId,
      occurredAt: now,
      actorId: actor.id,
      mode,
      sourceRequestId: source.id,
      targetRequestId: target.id,
      similarityScore,
      reason,
    });

    source.updatedAt = now;
    target.updatedAt = now;

    await this.requestsRepository.update(target);
    await this.requestsRepository.update(source);

    this.domainEventsService.publish({
      name: 'request.merged',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        mergeId,
        mode,
        sourceRequestId: source.id,
        targetRequestId: target.id,
        similarityScore:
          similarityScore === undefined
            ? undefined
            : Number(similarityScore.toFixed(4)),
        reason,
      },
    });

    return target;
  }

  private appendDeduplicationEvidence(
    request: RequestEntity,
    evidence: RequestDeduplicationEvidenceEntry,
  ): void {
    if (!request.deduplicationEvidence) {
      request.deduplicationEvidence = [];
    }

    request.deduplicationEvidence.push(evidence);
  }

  private appendMergeHistory(
    request: RequestEntity,
    entry: RequestMergeHistoryEntry,
  ): void {
    if (!request.mergeHistory) {
      request.mergeHistory = [];
    }

    request.mergeHistory.push(entry);
  }

  private bumpDeduplicationMetric(
    organizationId: string,
    field: keyof DeduplicationMetrics,
  ): void {
    const current = this.deduplicationMetricsByOrganization.get(
      organizationId,
    ) ?? {
      totalEvaluations: 0,
      created: 0,
      suggested: 0,
      autoLinked: 0,
      autoMerged: 0,
      manualMerged: 0,
      reversals: 0,
    };

    current[field] += 1;
    this.deduplicationMetricsByOrganization.set(organizationId, current);
  }

  private async publishDeduplicationDecisionEvent(
    actor: AuthenticatedUser,
    payload: {
      decision: RequestDeduplicationDecision;
      sourceRequestId?: string;
      targetRequestId?: string;
      similarityScore?: number;
      candidatesCount: number;
    },
  ): Promise<void> {
    this.domainEventsService.publish({
      name: 'request.deduplication_decision_made',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload,
    });
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

  private async insertComment(comment: RequestCommentEntity): Promise<void> {
    if (this.requestCommentsRepository) {
      await this.requestCommentsRepository.insert(comment);
      return;
    }

    this.inMemoryComments.push(comment);
  }

  private async readComments(
    requestId: string,
    organizationId: string,
  ): Promise<RequestCommentEntity[]> {
    if (this.requestCommentsRepository) {
      return this.requestCommentsRepository.listByRequest(
        requestId,
        organizationId,
      );
    }

    return this.inMemoryComments
      .filter(
        (comment) =>
          comment.requestId === requestId &&
          comment.organizationId === organizationId,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
