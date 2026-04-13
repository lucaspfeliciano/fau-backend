import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationEntity } from '../organizations/entities/organization.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import type { QueryRequestsInput } from '../requests/dto/query-requests.schema';
import { RequestsService } from '../requests/requests.service';
import type { QueryRoadmapItemsInput } from '../roadmap/dto/query-roadmap-items.schema';
import { RoadmapService } from '../roadmap/roadmap.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreatePublicCommentInput } from './dto/create-public-comment.schema';
import type { CreatePublicRequestInput } from './dto/create-public-request.schema';
import type { CreatePublicVoteInput } from './dto/create-public-vote.schema';

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

@Injectable()
export class PublicPortalService {
  private static readonly VOTE_FINGERPRINT_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly voteFingerprints = new Map<string, number>();

  constructor(
    private readonly organizationsService: OrganizationsService,
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
    const workspace = await this.resolveWorkspace(workspaceSlug);
    this.ensurePublicPortalEnabled(workspace);

    const request = await this.requestsService.createFromPublicPortal(
      {
        title: input.title,
        description: input.description,
        boardId: input.boardId,
        tags: input.tags,
        publicSubmitterName: input.publicSubmitterName,
        publicSubmitterEmail: input.publicSubmitterEmail,
      },
      workspace.id,
    );

    return {
      request: this.toPublicRequestItem(request),
    };
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
