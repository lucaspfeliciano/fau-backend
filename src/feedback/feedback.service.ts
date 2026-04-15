import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { QueryFeedbackDto } from './dto/query-feedback.dto';
import type { CreateFeedbackDto } from './dto/create-feedback.dto';
import type { FeedbackEntity } from './entities/feedback.entity';
import {
  FEEDBACKS_REPOSITORY,
  type FeedbacksRepository,
} from './repositories/feedbacks-repository.interface';

export interface PaginatedFeedbackResult {
  items: FeedbackEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACKS_REPOSITORY)
    private readonly feedbacksRepository: FeedbacksRepository,
  ) {}

  async create(
    input: CreateFeedbackDto,
    actor: AuthenticatedUser,
  ): Promise<FeedbackEntity> {
    const feedback: FeedbackEntity = {
      id: randomUUID(),
      workspaceId: actor.organizationId,
      title: input.title.trim(),
      description: input.description.trim(),
      source: input.source,
      publicSubmitterName: input.publicSubmitterName?.trim(),
      publicSubmitterEmail: input.publicSubmitterEmail?.trim().toLowerCase(),
      customerId: input.customerId?.trim(),
      createdAt: new Date().toISOString(),
    };

    await this.feedbacksRepository.insert(feedback);
    return feedback;
  }

  async list(
    query: QueryFeedbackDto,
    workspaceId: string,
  ): Promise<PaginatedFeedbackResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.feedbacksRepository.queryByWorkspace) {
      const result = await this.feedbacksRepository.queryByWorkspace(
        workspaceId,
        {
          page,
          limit,
          source: query.source,
          customerId: query.customerId,
          search: query.search,
        },
      );

      return {
        items: result.items,
        page,
        limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
      };
    }

    const filtered = (
      await this.feedbacksRepository.listByWorkspace(workspaceId)
    )
      .filter((item) => {
        if (!query.source) {
          return true;
        }

        return item.source === query.source;
      })
      .filter((item) => {
        if (!query.customerId) {
          return true;
        }

        return item.customerId === query.customerId;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

  async ensureExists(
    ids: string[] | undefined,
    workspaceId: string,
  ): Promise<void> {
    const uniqueIds = this.uniqueValues(ids);
    if (uniqueIds.length === 0) {
      return;
    }

    const found = await this.feedbacksRepository.findByIds(
      uniqueIds,
      workspaceId,
    );
    const foundIds = new Set(found.map((item) => item.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new BadRequestException('One or more feedbackIds are invalid.');
    }
  }

  async findOneById(id: string, workspaceId: string): Promise<FeedbackEntity> {
    const [feedback] = await this.feedbacksRepository.findByIds(
      [id],
      workspaceId,
    );

    if (!feedback) {
      throw new NotFoundException('Feedback not found.');
    }

    return feedback;
  }

  async voteFromPublicPortal(
    feedbackId: string,
    workspaceId: string,
  ): Promise<FeedbackEntity> {
    return this.feedbacksRepository.incrementVotes(feedbackId, workspaceId);
  }

  private uniqueValues(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const normalized = value.trim();
      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(normalized);
    }

    return result;
  }
}
