import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestsService } from '../requests/requests.service';
import type { ApproveReviewQueueBatchInput } from './dto/approve-review-queue-batch.schema';
import type { ImportNotesInput } from './dto/import-notes.schema';
import type { MatchSimilarRequestsInput } from './dto/match-similar-requests.schema';
import type { QueryReviewQueueInput } from './dto/query-review-queue.schema';
import { AiExtractedItemType } from './entities/ai-extracted-item-type.enum';
import type { AiExtractedItem } from './entities/ai-extracted-item.interface';
import type { AiReviewQueueItemEntity } from './entities/ai-review-queue-item.entity';
import { AiReviewQueueStatus } from './entities/ai-review-queue-status.enum';
import { AiReviewQueueSuggestedAction } from './entities/ai-review-queue-suggested-action.enum';
import { AiReviewQueueRepository } from './repositories/ai-review-queue.repository';

interface ProcessedItemResult {
  item: AiExtractedItem;
  action: 'created' | 'deduplicated' | 'merged' | 'queued';
  similarity?: number;
  request?: RequestEntity;
  queueItemId?: string;
  deduplicationDecision?:
    | 'created'
    | 'suggested'
    | 'auto_linked'
    | 'auto_merged';
  similarCandidates?: {
    requestId: string;
    similarityScore: number;
    actionSuggested: 'suggest_review' | 'auto_link' | 'auto_merge';
  }[];
}

export interface ImportNotesResult {
  processedAt: string;
  sourceType: RequestSourceType;
  noteExternalId?: string;
  totalExtractedItems: number;
  createdRequests: number;
  deduplicatedRequests: number;
  mergedRequests: number;
  queuedForReviewItems: number;
  lowConfidenceItems: number;
  items: ProcessedItemResult[];
}

export interface SimilarMatchItem {
  requestId: string;
  similarityScore: number;
  reason: string;
}

export interface ReviewQueueListResult {
  items: AiReviewQueueItemEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReviewQueueBatchApprovalResult {
  approved: number;
  failed: number;
  results: {
    itemId: string;
    status: 'approved' | 'failed';
    reason?: string;
  }[];
}

interface AiQualityMetrics {
  totalImports: number;
  totalExtractedItems: number;
  createdRequests: number;
  deduplicatedRequests: number;
  mergedRequests: number;
  lowConfidenceItems: number;
  confidenceSum: number;
}

@Injectable()
export class AiProcessingService {
  private static readonly MATCHING_PAGE_LIMIT = 100;
  private readonly logger = new Logger(AiProcessingService.name);
  private readonly qualityMetricsByOrganization = new Map<
    string,
    AiQualityMetrics
  >();

  constructor(
    private readonly requestsService: RequestsService,
    private readonly domainEventsService: DomainEventsService,
    private readonly aiReviewQueueRepository: AiReviewQueueRepository,
  ) {}

  async importNotes(
    input: ImportNotesInput,
    actor: AuthenticatedUser,
  ): Promise<ImportNotesResult> {
    this.logger.log(
      `Starting AI notes import for org=${actor.organizationId} source=${input.sourceType}`,
    );

    const timeoutMs = input.timeoutMs ?? 1500;

    let extractedItems: AiExtractedItem[];
    try {
      extractedItems = await this.runWithTimeout(
        () => Promise.resolve(this.extractItems(input.text)),
        timeoutMs,
      );
    } catch {
      this.domainEventsService.publish({
        name: 'ai.processing_failed',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          sourceType: input.sourceType,
          noteExternalId: input.noteExternalId,
          timeoutMs,
        },
      });

      throw new RequestTimeoutException(
        'AI provider timeout while processing notes.',
      );
    }

    const results: ProcessedItemResult[] = [];

    for (const extractedItem of extractedItems) {
      const similar = await this.requestsService.findMostSimilarByText(
        actor.organizationId,
        extractedItem.normalizedText,
        0.35,
      );

      if (extractedItem.requiresHumanReview) {
        const queued = await this.enqueueReviewItem(
          extractedItem,
          input,
          actor,
          similar,
        );

        results.push({
          item: extractedItem,
          action: 'queued',
          similarity: similar ? Number(similar.score.toFixed(4)) : undefined,
          queueItemId: queued.id,
        });

        continue;
      }

      const createPayload = {
        title: this.buildTitle(extractedItem.rawExcerpt),
        description: extractedItem.normalizedText,
        sourceType: RequestSourceType.AiImport,
        sourceRef: JSON.stringify({
          sourceType: input.sourceType,
          noteExternalId: input.noteExternalId,
          extractedAt: new Date().toISOString(),
          confidence: extractedItem.confidence,
          requiresHumanReview: extractedItem.requiresHumanReview,
          evidence: extractedItem.rawExcerpt,
        }),
        tags: [
          `ai:${extractedItem.type}`,
          ...extractedItem.suggestedTags,
          ...(extractedItem.requiresHumanReview ? ['ai-review-required'] : []),
        ],
      };

      const intelligentResult =
        await this.requestsService.createWithIntelligentDeduplication(
          createPayload,
          actor,
        );

      const topCandidate = intelligentResult.candidates[0];

      if (intelligentResult.decision === 'auto_linked') {
        this.domainEventsService.publish({
          name: 'ai.request_deduplicated',
          occurredAt: new Date().toISOString(),
          actorId: actor.id,
          organizationId: actor.organizationId,
          payload: {
            requestId: intelligentResult.request.id,
            similarity: topCandidate?.similarityScore,
            sourceType: input.sourceType,
            noteExternalId: input.noteExternalId,
            confidence: extractedItem.confidence,
          },
        });

        results.push({
          item: extractedItem,
          action: 'deduplicated',
          similarity: topCandidate?.similarityScore,
          request: intelligentResult.request,
          deduplicationDecision: intelligentResult.decision,
          similarCandidates: intelligentResult.candidates,
        });

        continue;
      }

      if (intelligentResult.decision === 'auto_merged') {
        this.domainEventsService.publish({
          name: 'ai.request_merged',
          occurredAt: new Date().toISOString(),
          actorId: actor.id,
          organizationId: actor.organizationId,
          payload: {
            requestId: intelligentResult.request.id,
            mergedRequestId: intelligentResult.mergedRequestId,
            similarity: topCandidate?.similarityScore,
            sourceType: input.sourceType,
            noteExternalId: input.noteExternalId,
            confidence: extractedItem.confidence,
          },
        });

        results.push({
          item: extractedItem,
          action: 'merged',
          similarity: topCandidate?.similarityScore,
          request: intelligentResult.request,
          deduplicationDecision: intelligentResult.decision,
          similarCandidates: intelligentResult.candidates,
        });

        continue;
      }

      this.domainEventsService.publish({
        name: 'ai.request_created',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: intelligentResult.request.id,
          sourceType: input.sourceType,
          noteExternalId: input.noteExternalId,
          confidence: extractedItem.confidence,
          requiresHumanReview: extractedItem.requiresHumanReview,
          deduplicationDecision: intelligentResult.decision,
        },
      });

      results.push({
        item: extractedItem,
        action: 'created',
        request: intelligentResult.request,
        deduplicationDecision: intelligentResult.decision,
        similarCandidates: intelligentResult.candidates,
      });
    }

    const response: ImportNotesResult = {
      processedAt: new Date().toISOString(),
      sourceType: input.sourceType,
      noteExternalId: input.noteExternalId,
      totalExtractedItems: results.length,
      createdRequests: results.filter((item) => item.action === 'created')
        .length,
      deduplicatedRequests: results.filter(
        (item) => item.action === 'deduplicated',
      ).length,
      mergedRequests: results.filter((item) => item.action === 'merged').length,
      queuedForReviewItems: results.filter((item) => item.action === 'queued')
        .length,
      lowConfidenceItems: results.filter((item) => item.action === 'queued')
        .length,
      items: results,
    };

    this.domainEventsService.publish({
      name: 'ai.processing_completed',
      occurredAt: response.processedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        sourceType: input.sourceType,
        noteExternalId: input.noteExternalId,
        totalExtractedItems: response.totalExtractedItems,
        createdRequests: response.createdRequests,
        deduplicatedRequests: response.deduplicatedRequests,
        mergedRequests: response.mergedRequests,
        queuedForReviewItems: response.queuedForReviewItems,
      },
    });

    this.logger.log(
      `AI import completed for org=${actor.organizationId} created=${response.createdRequests} deduplicated=${response.deduplicatedRequests} merged=${response.mergedRequests} queued=${response.queuedForReviewItems}`,
    );

    this.updateQualityMetrics(actor.organizationId, response);

    return response;
  }

  async matchSimilarRequests(
    input: MatchSimilarRequestsInput,
    actor: AuthenticatedUser,
  ): Promise<{ matches: SimilarMatchItem[] }> {
    if (input.organizationId && input.organizationId !== actor.organizationId) {
      this.logger.warn(
        `Ignoring organizationId override in match-similar for user=${actor.id}`,
      );
    }

    const organizationRequests = await this.collectAllRequests(
      actor.organizationId,
    );

    const normalizedText = input.text.trim().toLowerCase();
    if (!normalizedText) {
      return { matches: [] };
    }

    const threshold = 0.2;

    const matches = organizationRequests
      .map((request) => {
        const referenceText = `${request.title} ${request.description}`;
        const { score, overlaps } = this.calculateTextSimilarityWithReasons(
          normalizedText,
          referenceText,
        );

        return {
          request,
          score,
          overlaps,
        };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => ({
        requestId: item.request.id,
        similarityScore: Number(item.score.toFixed(4)),
        reason:
          item.overlaps.length > 0
            ? `Sobreposicao de termos: ${item.overlaps.join(', ')}`
            : 'Similaridade semantica relevante.',
      }));

    return {
      matches,
    };
  }

  async listReviewQueue(
    query: QueryReviewQueueInput,
    organizationId: string,
  ): Promise<ReviewQueueListResult> {
    const allItems = await this.aiReviewQueueRepository.listByOrganization(
      organizationId,
      query.status,
    );

    const page = query.page;
    const limit = query.limit;
    const total = allItems.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      items: allItems.slice(offset, offset + limit),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async approveReviewQueueItem(
    itemId: string,
    actor: AuthenticatedUser,
  ): Promise<AiReviewQueueItemEntity> {
    const item = await this.findReviewQueueItem(itemId, actor.organizationId);

    if (item.status !== AiReviewQueueStatus.Pending) {
      throw new BadRequestException('Review queue item is not pending.');
    }

    let resultingRequestId: string | undefined;

    if (
      item.suggestedAction === AiReviewQueueSuggestedAction.Deduplicate &&
      item.matchedRequestId
    ) {
      const voted = await this.requestsService.vote(
        item.matchedRequestId,
        actor,
      );
      resultingRequestId = voted.id;
    } else {
      const created = await this.requestsService.create(
        {
          title: this.buildTitle(item.rawExcerpt),
          description: item.normalizedText,
          sourceType: item.sourceType,
          sourceRef: JSON.stringify({
            reviewQueueItemId: item.id,
            confidence: item.confidence,
            approvedAt: new Date().toISOString(),
          }),
          tags: [...item.suggestedTags, 'ai-reviewed'],
        },
        actor,
      );

      resultingRequestId = created.id;
    }

    item.status = AiReviewQueueStatus.Approved;
    item.resolvedAt = new Date().toISOString();
    item.resolvedBy = actor.id;
    item.resultingRequestId = resultingRequestId;

    await this.aiReviewQueueRepository.update(item);

    this.domainEventsService.publish({
      name: 'ai.review_queue_item_approved',
      occurredAt: item.resolvedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        itemId: item.id,
        resultingRequestId,
      },
    });

    return item;
  }

  async rejectReviewQueueItem(
    itemId: string,
    actor: AuthenticatedUser,
  ): Promise<AiReviewQueueItemEntity> {
    const item = await this.findReviewQueueItem(itemId, actor.organizationId);

    if (item.status !== AiReviewQueueStatus.Pending) {
      throw new BadRequestException('Review queue item is not pending.');
    }

    item.status = AiReviewQueueStatus.Rejected;
    item.resolvedAt = new Date().toISOString();
    item.resolvedBy = actor.id;

    await this.aiReviewQueueRepository.update(item);

    this.domainEventsService.publish({
      name: 'ai.review_queue_item_rejected',
      occurredAt: item.resolvedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        itemId: item.id,
      },
    });

    return item;
  }

  async approveReviewQueueBatch(
    input: ApproveReviewQueueBatchInput,
    actor: AuthenticatedUser,
  ): Promise<ReviewQueueBatchApprovalResult> {
    const uniqueItemIds = Array.from(new Set(input.itemIds));
    const results: ReviewQueueBatchApprovalResult['results'] = [];

    let approved = 0;
    let failed = 0;

    for (const itemId of uniqueItemIds) {
      try {
        await this.approveReviewQueueItem(itemId, actor);
        approved += 1;
        results.push({
          itemId,
          status: 'approved',
        });
      } catch (error) {
        failed += 1;
        results.push({
          itemId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unexpected error',
        });
      }
    }

    this.domainEventsService.publish({
      name: 'ai.review_queue_batch_approved',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        approved,
        failed,
      },
    });

    return {
      approved,
      failed,
      results,
    };
  }

  getQualityMetrics(organizationId: string) {
    const metrics = this.qualityMetricsByOrganization.get(organizationId) ?? {
      totalImports: 0,
      totalExtractedItems: 0,
      createdRequests: 0,
      deduplicatedRequests: 0,
      mergedRequests: 0,
      lowConfidenceItems: 0,
      confidenceSum: 0,
    };

    const averageConfidence =
      metrics.totalExtractedItems === 0
        ? 0
        : Number(
            (metrics.confidenceSum / metrics.totalExtractedItems).toFixed(4),
          );
    const deduplicationRate =
      metrics.totalExtractedItems === 0
        ? 0
        : Number(
            (
              (metrics.deduplicatedRequests + metrics.mergedRequests) /
              metrics.totalExtractedItems
            ).toFixed(4),
          );

    return {
      totalImports: metrics.totalImports,
      totalExtractedItems: metrics.totalExtractedItems,
      createdRequests: metrics.createdRequests,
      deduplicatedRequests: metrics.deduplicatedRequests,
      mergedRequests: metrics.mergedRequests,
      lowConfidenceItems: metrics.lowConfidenceItems,
      averageConfidence,
      deduplicationRate,
      manualReviewRate:
        metrics.totalExtractedItems === 0
          ? 0
          : Number(
              (
                metrics.lowConfidenceItems / metrics.totalExtractedItems
              ).toFixed(4),
            ),
    };
  }

  extractItems(rawText: string): AiExtractedItem[] {
    const normalizedText = rawText.replace(/\r\n/g, '\n').trim();
    const rawSegments = normalizedText
      .split(/\n+|[•\-*]\s+/g)
      .flatMap((segment) => segment.split(/(?<=[.!?])\s+/g))
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 10);

    const uniqueSegments = Array.from(new Set(rawSegments));

    return uniqueSegments.map((segment) => {
      const lowered = segment.toLowerCase();
      const type = this.classifyItemType(lowered);
      const suggestedTags = this.suggestTags(lowered, type);
      const confidence = this.estimateConfidence(lowered, type);

      return {
        rawExcerpt: segment,
        normalizedText: this.normalizeText(segment),
        type,
        confidence,
        requiresHumanReview: confidence < 0.55,
        suggestedTags,
      };
    });
  }

  private classifyItemType(loweredText: string): AiExtractedItemType {
    if (
      /(erro|falha|bug|quebra|quebrou|lento|timeout|trav)/i.test(loweredText)
    ) {
      return AiExtractedItemType.Bug;
    }

    if (
      /(dor|dificuldade|fric|manual|retrabalho|demorado|confus)/i.test(
        loweredText,
      )
    ) {
      return AiExtractedItemType.PainPoint;
    }

    return AiExtractedItemType.FeatureRequest;
  }

  private suggestTags(
    loweredText: string,
    type: AiExtractedItemType,
  ): string[] {
    const tags = new Set<string>([type]);

    if (/(integra|slack|hubspot|linear|api|fireflies)/i.test(loweredText)) {
      tags.add('integrations');
    }

    if (/(dashboard|ui|ux|interface|layout)/i.test(loweredText)) {
      tags.add('ui');
    }

    if (/(seguran|acesso|permiss|compliance)/i.test(loweredText)) {
      tags.add('security');
    }

    if (/(relat|export|csv|filtro)/i.test(loweredText)) {
      tags.add('reporting');
    }

    return [...tags].slice(0, 6);
  }

  private estimateConfidence(
    loweredText: string,
    type: AiExtractedItemType,
  ): number {
    let score = 0.45;

    if (loweredText.length > 60) {
      score += 0.12;
    }

    if (/(cliente|customer|usuario|usuário)/i.test(loweredText)) {
      score += 0.08;
    }

    if (/(precisa|need|solicita|request|quer|gostaria)/i.test(loweredText)) {
      score += 0.1;
    }

    if (type !== AiExtractedItemType.FeatureRequest) {
      score += 0.07;
    }

    return Number(Math.min(0.99, score).toFixed(2));
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private buildTitle(text: string): string {
    const clean = this.normalizeText(text);
    if (clean.length <= 90) {
      return clean;
    }

    return `${clean.slice(0, 87)}...`;
  }

  private async runWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private updateQualityMetrics(
    organizationId: string,
    result: ImportNotesResult,
  ): void {
    const current = this.qualityMetricsByOrganization.get(organizationId) ?? {
      totalImports: 0,
      totalExtractedItems: 0,
      createdRequests: 0,
      deduplicatedRequests: 0,
      mergedRequests: 0,
      lowConfidenceItems: 0,
      confidenceSum: 0,
    };

    current.totalImports += 1;
    current.totalExtractedItems += result.totalExtractedItems;
    current.createdRequests += result.createdRequests;
    current.deduplicatedRequests += result.deduplicatedRequests;
    current.mergedRequests += result.mergedRequests;
    current.lowConfidenceItems += result.lowConfidenceItems;
    current.confidenceSum += result.items.reduce(
      (acc, item) => acc + item.item.confidence,
      0,
    );

    this.qualityMetricsByOrganization.set(organizationId, current);
  }

  private async enqueueReviewItem(
    extractedItem: AiExtractedItem,
    input: ImportNotesInput,
    actor: AuthenticatedUser,
    similar:
      | Awaited<ReturnType<RequestsService['findMostSimilarByText']>>
      | undefined,
  ): Promise<AiReviewQueueItemEntity> {
    const now = new Date().toISOString();

    const queueItem: AiReviewQueueItemEntity = {
      id: randomUUID(),
      organizationId: actor.organizationId,
      sourceType: input.sourceType,
      noteExternalId: input.noteExternalId,
      itemType: extractedItem.type,
      rawExcerpt: extractedItem.rawExcerpt,
      normalizedText: extractedItem.normalizedText,
      confidence: extractedItem.confidence,
      suggestedTags: extractedItem.suggestedTags,
      suggestedAction: similar
        ? AiReviewQueueSuggestedAction.Deduplicate
        : AiReviewQueueSuggestedAction.Create,
      matchedRequestId: similar?.request.id,
      matchedSimilarity: similar ? Number(similar.score.toFixed(4)) : undefined,
      status: AiReviewQueueStatus.Pending,
      createdAt: now,
    };

    await this.aiReviewQueueRepository.insert(queueItem);

    this.domainEventsService.publish({
      name: 'ai.review_queue_item_created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        itemId: queueItem.id,
        sourceType: queueItem.sourceType,
        confidence: queueItem.confidence,
        suggestedAction: queueItem.suggestedAction,
      },
    });

    return queueItem;
  }

  private async findReviewQueueItem(
    itemId: string,
    organizationId: string,
  ): Promise<AiReviewQueueItemEntity> {
    const item = await this.aiReviewQueueRepository.findById(
      itemId,
      organizationId,
    );

    if (!item) {
      throw new NotFoundException('Review queue item not found.');
    }

    return item;
  }

  private calculateTextSimilarityWithReasons(
    a: string,
    b: string,
  ): { score: number; overlaps: string[] } {
    const tokensA = new Set(this.tokenize(a));
    const tokensB = new Set(this.tokenize(b));

    if (tokensA.size === 0 || tokensB.size === 0) {
      return {
        score: 0,
        overlaps: [],
      };
    }

    const overlaps: string[] = [];
    for (const token of tokensA) {
      if (tokensB.has(token)) {
        overlaps.push(token);
      }
    }

    const unionSize = new Set([...tokensA, ...tokensB]).size;

    return {
      score: unionSize === 0 ? 0 : overlaps.length / unionSize,
      overlaps: overlaps.slice(0, 5),
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
  }

  private async collectAllRequests(
    organizationId: string,
  ): Promise<RequestEntity[]> {
    const requests: RequestEntity[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await this.requestsService.list(
        {
          page,
          limit: AiProcessingService.MATCHING_PAGE_LIMIT,
          includeArchived: false,
        },
        organizationId,
      );

      requests.push(...result.items);
      totalPages = result.totalPages;
      if (totalPages === 0) {
        break;
      }

      page += 1;
    }

    return requests;
  }
}
