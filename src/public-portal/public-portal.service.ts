import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { CreateFeedbackDto } from '../feedback/dto/create-feedback.dto';
import { FeedbackSource } from '../feedback/entities/feedback-source.enum';
import { FeedbackService } from '../feedback/feedback.service';
import type { OrganizationEntity } from '../organizations/entities/organization.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import type { QueryRequestsInput } from '../requests/dto/query-requests.schema';
import { RequestsService } from '../requests/requests.service';
import type { QueryRoadmapItemsInput } from '../roadmap/dto/query-roadmap-items.schema';
import { RoadmapService } from '../roadmap/roadmap.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreatePublicRequestPathCommentInput } from './dto/create-public-request-path-comment.schema';
import type { CreatePublicCommentInput } from './dto/create-public-comment.schema';
import type { CreatePublicRequestInput } from './dto/create-public-request.schema';
import type { CreatePublicRequestPathVoteInput } from './dto/create-public-request-path-vote.schema';
import type { CreatePublicVoteInput } from './dto/create-public-vote.schema';
import type { FindSimilarPublicRequestsInput } from './dto/find-similar-public-requests.schema';
import type { UpdatePublicWorkspaceSettingsInput } from './dto/update-public-workspace-settings.schema';

export interface PublicRequestItem {
  id: string;
  title: string;
  description: string;
  boardId?: string;
  status: string;
  votes: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicRoadmapItem {
  id: string;
  title: string;
  post: string;
  board: string;
  category: string;
  status: string;
  tags: string[];
  score: number;
  eta: {
    date?: string;
    confidence: string;
    source: string;
  };
  impact: {
    customers: number;
    strategicAccounts: number;
    revenueAtRisk: number;
  };
  riskLevel: string;
  updatedAt: string;
}

export interface PublicFeedbackItem {
  id: string;
  title: string;
  description: string;
  source: string;
  publicSubmitterName?: string;
  votes: number;
  createdAt: string;
}

export interface PublicWorkspaceSettings {
  workspaceSlug: string;
  widgetApiKey?: string;
  publicPortalEnabled: boolean;
  publicRoadmapEnabled: boolean;
  publicChangelogEnabled: boolean;
}

@Injectable()
export class PublicPortalService {
  private static readonly VOTE_FINGERPRINT_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly voteFingerprints = new Map<string, number>();

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly feedbackService: FeedbackService,
    private readonly requestsService: RequestsService,
    private readonly roadmapService: RoadmapService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listRequests(workspaceSlug: string, query: QueryRequestsInput) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const result = await this.requestsService.list(
      {
        page: query.page,
        limit: query.limit,
        boardId: query.boardId,
        status: query.status,
        tag: query.tag,
        search: query.search,
        includeArchived: false,
      },
      workspace.id,
    );

    return {
      items: result.items.map((item) => this.toPublicRequestItem(item)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  async createRequest(workspaceSlug: string, input: CreatePublicRequestInput) {
    // Deprecated alias: kept route path for migration, but now follows
    // feedback-first intake semantics.
    return this.createFeedback(workspaceSlug, input);
  }

  async createFeedback(
    workspaceSlug: string,
    input: CreatePublicRequestInput,
  ): Promise<{ feedback: PublicFeedbackItem }> {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const feedback = await this.feedbackService.create(
      {
        title: input.title,
        description: input.description,
        source: FeedbackSource.PublicPortal,
        publicSubmitterName: input.publicSubmitterName,
        publicSubmitterEmail: input.publicSubmitterEmail,
      } satisfies CreateFeedbackDto,
      this.buildPublicPortalActor(workspace.id),
    );

    return {
      feedback: this.toPublicFeedbackItem(feedback),
    };
  }

  async listFeedbacks(
    workspaceSlug: string,
    query: { page?: number; limit?: number; search?: string },
  ): Promise<{
    items: PublicFeedbackItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const result = await this.feedbackService.list(
      {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
      },
      workspace.id,
    );

    return {
      items: result.items.map((item) => this.toPublicFeedbackItem(item)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  async getFeedback(
    workspaceSlug: string,
    feedbackId: string,
  ): Promise<{ feedback: PublicFeedbackItem }> {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const feedback = await this.feedbackService.findOneById(
      feedbackId,
      workspace.id,
    );

    return {
      feedback: this.toPublicFeedbackItem(feedback),
    };
  }

  async voteFeedback(
    workspaceSlug: string,
    input: { feedbackId: string; sessionId?: string },
    clientIp?: string,
  ): Promise<{ feedbackId: string; votes: number; duplicate: boolean }> {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const fingerprint = this.resolveVoteFingerprint(input.sessionId, clientIp);
    const accepted = this.registerVoteFingerprint(
      workspace.id,
      input.feedbackId,
      fingerprint,
    );

    if (!accepted) {
      const feedback = await this.feedbackService.findOneById(
        input.feedbackId,
        workspace.id,
      );

      return {
        feedbackId: feedback.id,
        votes: feedback.votes ?? 0,
        duplicate: true,
      };
    }

    const feedback = await this.feedbackService.voteFromPublicPortal(
      input.feedbackId,
      workspace.id,
    );

    return {
      feedbackId: feedback.id,
      votes: feedback.votes ?? 0,
      duplicate: false,
    };
  }

  async getSettings(workspaceSlug: string): Promise<PublicWorkspaceSettings> {
    const workspace =
      await this.organizationsService.getPublicSettingsBySlug(workspaceSlug);

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    return this.toPublicWorkspaceSettings(workspace);
  }

  async updateSettings(
    workspaceSlug: string,
    input: UpdatePublicWorkspaceSettingsInput,
  ): Promise<PublicWorkspaceSettings> {
    const workspace =
      await this.organizationsService.updatePublicSettingsBySlug(
        workspaceSlug,
        input,
      );

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    return this.toPublicWorkspaceSettings(workspace);
  }

  async findSimilarRequests(
    workspaceSlug: string,
    input: FindSimilarPublicRequestsInput,
  ) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    return this.requestsService.findSimilarRequests(workspace.id, {
      title: input.title,
      details: input.details ?? input.title,
    });
  }

  async getRequest(workspaceSlug: string, requestId: string) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const request = await this.requestsService.findOneById(
      requestId,
      workspace.id,
    );

    return {
      request: this.toPublicRequestItem(request),
    };
  }

  async listRequestComments(workspaceSlug: string, requestId: string) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const comments = await this.requestsService.listComments(
      requestId,
      workspace.id,
    );

    return {
      items: comments.map((comment) => ({
        id: comment.id,
        requestId: comment.requestId,
        text: comment.comment,
        name: comment.publicAuthorName,
        createdAt: comment.createdAt,
      })),
      total: comments.length,
    };
  }

  async addCommentToRequest(
    workspaceSlug: string,
    requestId: string,
    input: CreatePublicRequestPathCommentInput,
  ) {
    return this.addComment(workspaceSlug, {
      requestId,
      text: input.text,
      publicAuthorName: input.name?.trim() || 'Anonymous',
      publicAuthorEmail:
        input.email?.trim() || `anonymous+${requestId}@public.local`,
    });
  }

  async voteOnRequest(
    workspaceSlug: string,
    requestId: string,
    input: CreatePublicRequestPathVoteInput,
    clientIp?: string,
  ) {
    return this.voteRequest(
      workspaceSlug,
      {
        requestId,
        sessionId: input.visitorId,
      },
      clientIp,
    );
  }

  async voteRequest(
    workspaceSlug: string,
    input: CreatePublicVoteInput,
    clientIp?: string,
  ) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const fingerprint = this.resolveVoteFingerprint(input.sessionId, clientIp);
    const accepted = this.registerVoteFingerprint(
      workspace.id,
      input.requestId,
      fingerprint,
    );

    if (!accepted) {
      const request = await this.requestsService.findOneById(
        input.requestId,
        workspace.id,
      );

      return {
        requestId: request.id,
        votes: request.votes,
        duplicate: true,
      };
    }

    const request = await this.requestsService.voteFromPublicPortal(
      input.requestId,
      workspace.id,
      fingerprint ?? 'public-portal',
    );

    return {
      requestId: request.id,
      votes: request.votes,
      duplicate: false,
    };
  }

  async addComment(workspaceSlug: string, input: CreatePublicCommentInput) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const comment = await this.requestsService.addPublicComment(
      input.requestId,
      {
        comment: input.text,
        publicAuthorName: input.publicAuthorName,
        publicAuthorEmail: input.publicAuthorEmail,
      },
      workspace.id,
    );

    return {
      comment: {
        id: comment.id,
        requestId: comment.requestId,
        text: comment.comment,
        publicAuthorName: comment.publicAuthorName,
        createdAt: comment.createdAt,
      },
    };
  }

  async listRoadmap(workspaceSlug: string, query: QueryRoadmapItemsInput) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicRoadmapEnabled(workspace);

    const result = await this.roadmapService.listItems(query, workspace.id);

    return {
      items: result.items.map(
        (item) =>
          ({
            id: item.id,
            title: item.title,
            post: item.post,
            board: item.board,
            category: item.category,
            status: item.status,
            tags: item.tags,
            score: item.score,
            eta: item.eta,
            impact: item.impact,
            riskLevel: item.riskLevel,
            updatedAt: item.updatedAt,
          }) satisfies PublicRoadmapItem,
      ),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  async listChangelog(workspaceSlug: string) {
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicChangelogEnabled(workspace);

    const releases = (
      await this.notificationsService.listReleases(workspace.id)
    )
      .filter((release) => release.status === 'published')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      items: releases.map((release) => ({
        id: release.id,
        version: release.version,
        title: release.title,
        notes: release.notes,
        status: release.status,
        scheduledAt: release.scheduledAt,
        createdAt: release.createdAt,
        updatedAt: release.updatedAt,
      })),
      total: releases.length,
    };
  }

  private async resolveWorkspace(
    workspaceSlug: string,
  ): Promise<OrganizationEntity> {
    const workspace = await this.organizationsService.findBySlug(workspaceSlug);

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    return workspace;
  }

  private ensurePublicPortalEnabled(workspace: OrganizationEntity): void {
    if (!workspace.publicPortalEnabled) {
      throw new ForbiddenException(
        'Public portal is disabled for this workspace.',
      );
    }
  }

  private ensurePublicRoadmapEnabled(workspace: OrganizationEntity): void {
    if (!workspace.publicRoadmapEnabled) {
      throw new ForbiddenException(
        'Public roadmap is disabled for this workspace.',
      );
    }
  }

  private ensurePublicChangelogEnabled(workspace: OrganizationEntity): void {
    if (!workspace.publicChangelogEnabled) {
      throw new ForbiddenException(
        'Public changelog is disabled for this workspace.',
      );
    }
  }

  private toPublicRequestItem(item: {
    id: string;
    title: string;
    description: string;
    boardId?: string;
    status: string;
    votes: number;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }): PublicRequestItem {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      boardId: item.boardId,
      status: item.status,
      votes: item.votes,
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toPublicFeedbackItem(item: {
    id: string;
    title: string;
    description: string;
    source: string;
    publicSubmitterName?: string;
    votes?: number;
    createdAt: string;
  }): PublicFeedbackItem {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      source: item.source,
      publicSubmitterName: item.publicSubmitterName,
      votes: item.votes ?? 0,
      createdAt: item.createdAt,
    };
  }

  private toPublicWorkspaceSettings(
    workspace: OrganizationEntity,
  ): PublicWorkspaceSettings {
    return {
      workspaceSlug: workspace.slug,
      widgetApiKey: workspace.widgetApiKey,
      publicPortalEnabled: workspace.publicPortalEnabled,
      publicRoadmapEnabled: workspace.publicRoadmapEnabled,
      publicChangelogEnabled: workspace.publicChangelogEnabled,
    };
  }

  private buildPublicPortalActor(organizationId: string): AuthenticatedUser {
    return {
      id: 'public-portal',
      email: 'public-portal@system.local',
      name: 'Public Portal',
      role: Role.Viewer,
      organizationId,
    };
  }

  private resolveVoteFingerprint(
    sessionId: string | undefined,
    clientIp: string | undefined,
  ): string | undefined {
    if (sessionId && sessionId.trim().length > 0) {
      return `session:${sessionId.trim()}`;
    }

    if (clientIp && clientIp.trim().length > 0) {
      const firstIp = clientIp.split(',')[0]?.trim();
      if (firstIp) {
        return `ip:${firstIp}`;
      }
    }

    return undefined;
  }

  private registerVoteFingerprint(
    workspaceId: string,
    requestId: string,
    fingerprint: string | undefined,
  ): boolean {
    if (!fingerprint) {
      return true;
    }

    const now = Date.now();
    this.cleanupExpiredFingerprints(now);

    const key = `${workspaceId}:${requestId}:${fingerprint}`;
    const previous = this.voteFingerprints.get(key);

    if (
      previous !== undefined &&
      now - previous < PublicPortalService.VOTE_FINGERPRINT_TTL_MS
    ) {
      return false;
    }

    this.voteFingerprints.set(key, now);
    return true;
  }

  private cleanupExpiredFingerprints(now: number): void {
    for (const [key, createdAt] of this.voteFingerprints.entries()) {
      if (now - createdAt > PublicPortalService.VOTE_FINGERPRINT_TTL_MS) {
        this.voteFingerprints.delete(key);
      }
    }
  }
}
