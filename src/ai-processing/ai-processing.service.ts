import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestsService } from '../requests/requests.service';
import type { ImportNotesInput } from './dto/import-notes.schema';
import { AiExtractedItemType } from './entities/ai-extracted-item-type.enum';
import type { AiExtractedItem } from './entities/ai-extracted-item.interface';

interface ProcessedItemResult {
  item: AiExtractedItem;
  action: 'created' | 'deduplicated';
  similarity?: number;
  request: RequestEntity;
}

export interface ImportNotesResult {
  processedAt: string;
  sourceType: RequestSourceType;
  noteExternalId?: string;
  totalExtractedItems: number;
  createdRequests: number;
  deduplicatedRequests: number;
  lowConfidenceItems: number;
  items: ProcessedItemResult[];
}

@Injectable()
export class AiProcessingService {
  private readonly logger = new Logger(AiProcessingService.name);

  constructor(
    private readonly requestsService: RequestsService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async importNotes(
    input: ImportNotesInput,
    actor: AuthenticatedUser,
  ): Promise<ImportNotesResult> {
    const startedAt = new Date().toISOString();
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
        ,
      
        'AI provider timeout while processing notes.',
      );
    }

    const results: ProcessedItemResult[] = [];

    for (const extractedItem of extractedItems) {
      const similar = this.requestsService.findMostSimilarByText(
        actor.organizationId,
        extractedItem.normalizedText,
        0.32,
      );

      if (similar) {
        const voted = this.requestsService.vote(similar.request.id, actor);

        this.domainEventsService.publish({
          name: 'ai.request_deduplicated',
          occurredAt: new Date().toISOString(),
          actorId: actor.id,
          organizationId: actor.organizationId,
          payload: {
            requestId: voted.id,
            similarity: Number(similar.score.toFixed(4)),
            sourceType: input.sourceType,
            noteExternalId: input.noteExternalId,
            confidence: extractedItem.confidence,
          },
        });

        results.push({
          item: extractedItem,
          action: 'deduplicated',
          similarity: Number(similar.score.toFixed(4)),
          request: voted,
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

      const created = this.requestsService.create(createPayload, actor);

      this.domainEventsService.publish({
        name: 'ai.request_created',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          requestId: created.id,
          sourceType: input.sourceType,
          noteExternalId: input.noteExternalId,
          confidence: extractedItem.confidence,
          requiresHumanReview: extractedItem.requiresHumanReview,
        },
      });

      results.push({
        item: extractedItem,
        action: 'created',
        request: created,
      });
    }

    const response: ImportNotesResult = {
      processedAt: new Date().toISOString(),
      sourceType: input.sourceType,
      noteExternalId: input.noteExternalId,
        
      totalExtractedItems: results.length,
        ,
      )eatedRequests: results.filter((item) => item.action === 'created')
        .length,
      deduplicatedRequests: results.filter(
        (item) => item.action === 'deduplicated',
      ).length,
      lowConfidenceItems: results.filter(
        (item) => item.item.requiresHumanReview,
      ).length,
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
      },
    });

    this.logger.log(
      `AI import completed for org=${actor.organizationId} created=${response.createdRequests} deduplicated=${response.deduplicatedRequests}`,
    );

    return response;
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
      
        ,
      
    
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

    if (/(integra|slack|hubspot|linear|api)/i.test(loweredText)) {
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
}
