import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestInput } from '../requests/dto/create-request.schema';
import type { RequestEntity } from '../requests/entities/request.entity';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import { RequestStatus } from '../requests/entities/request-status.enum';
import { RequestsService } from '../requests/requests.service';
import type { CreatePlaygroundHypothesisDto } from './dto/create-playground-hypothesis.dto';
import type { CreatePlaygroundInsightDto } from './dto/create-playground-insight.dto';
import type { CreateLegacyPlaygroundNodeDto } from './dto/create-legacy-playground-node.dto';
import type { CreatePlaygroundWorkspaceDto } from './dto/create-playground-workspace.dto';
import type { PromotePlaygroundInsightToRequestDto } from './dto/promote-playground-insight-to-request.dto';
import type { QueryPlaygroundAssetsDto } from './dto/query-playground-assets.dto';
import type { QueryPlaygroundHypothesesDto } from './dto/query-playground-hypotheses.dto';
import type { QueryPlaygroundInsightsDto } from './dto/query-playground-insights.dto';
import type { QueryLegacyPlaygroundNodesDto } from './dto/query-legacy-playground-nodes.dto';
import type { QueryPlaygroundWorkspacesDto } from './dto/query-playground-workspaces.dto';
import type { UpdatePlaygroundHypothesisDto } from './dto/update-playground-hypothesis.dto';
import type { UpdatePlaygroundInsightDto } from './dto/update-playground-insight.dto';
import type { UpdateLegacyPlaygroundNodeDto } from './dto/update-legacy-playground-node.dto';
import type { UpdatePlaygroundWorkspaceDto } from './dto/update-playground-workspace.dto';
import type { UploadPlaygroundAssetDto } from './dto/upload-playground-asset.dto';
import type { PlaygroundAssetEntity } from './entities/playground-asset.entity';
import { PlaygroundHypothesisStatus } from './entities/playground-hypothesis-status.enum';
import type { PlaygroundHypothesisEntity } from './entities/playground-hypothesis.entity';
import { PlaygroundInsightType } from './entities/playground-insight-type.enum';
import type { PlaygroundInsightEntity } from './entities/playground-insight.entity';
import type { PlaygroundWorkspaceEntity } from './entities/playground-workspace.entity';
import {
  PLAYGROUND_ASSETS_REPOSITORY,
  type PlaygroundAssetsRepository,
} from './repositories/playground-assets-repository.interface';
import {
  PLAYGROUND_HYPOTHESES_REPOSITORY,
  type PlaygroundHypothesesRepository,
} from './repositories/playground-hypotheses-repository.interface';
import {
  PLAYGROUND_INSIGHTS_REPOSITORY,
  type PlaygroundInsightsRepository,
} from './repositories/playground-insights-repository.interface';
import {
  PLAYGROUND_WORKSPACES_REPOSITORY,
  type PlaygroundWorkspacesRepository,
} from './repositories/playground-workspaces-repository.interface';
import { PlaygroundStorageService } from './storage/playground-storage.service';

interface UploadedPlaygroundFile {
  originalname: string;
  filename: string;
  mimetype: string;
}

export interface PaginatedPlaygroundWorkspacesResult {
  items: PlaygroundWorkspaceEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPlaygroundAssetsResult {
  items: PlaygroundAssetEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPlaygroundHypothesesResult {
  items: PlaygroundHypothesisEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPlaygroundInsightsResult {
  items: PlaygroundInsightEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PromotePlaygroundInsightResult {
  insight: PlaygroundInsightEntity;
  request: RequestEntity;
}

export interface LegacyPlaygroundNode {
  id: string;
  type: string;
  title: string;
  content: string;
  linkedAssetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLegacyPlaygroundNodesResult {
  items: LegacyPlaygroundNode[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LegacyPlaygroundBoardCard {
  id: string;
  title: string;
  description?: string;
  status: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLegacyPlaygroundBoardCardsResult {
  items: LegacyPlaygroundBoardCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class PlaygroundService {
  constructor(
    @Inject(PLAYGROUND_WORKSPACES_REPOSITORY)
    private readonly playgroundWorkspacesRepository: PlaygroundWorkspacesRepository,
    @Inject(PLAYGROUND_ASSETS_REPOSITORY)
    private readonly playgroundAssetsRepository: PlaygroundAssetsRepository,
    @Inject(PLAYGROUND_HYPOTHESES_REPOSITORY)
    private readonly playgroundHypothesesRepository: PlaygroundHypothesesRepository,
    @Inject(PLAYGROUND_INSIGHTS_REPOSITORY)
    private readonly playgroundInsightsRepository: PlaygroundInsightsRepository,
    private readonly playgroundStorageService: PlaygroundStorageService,
    private readonly requestsService: RequestsService,
  ) {}

  async createWorkspace(
    input: CreatePlaygroundWorkspaceDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundWorkspaceEntity> {
    const now = new Date().toISOString();

    const workspace: PlaygroundWorkspaceEntity = {
      id: randomUUID(),
      workspaceId: actor.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.playgroundWorkspacesRepository.insert(workspace);
    return workspace;
  }

  async listWorkspaces(
    query: QueryPlaygroundWorkspacesDto,
    workspaceId: string,
  ): Promise<PaginatedPlaygroundWorkspacesResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.playgroundWorkspacesRepository.queryByWorkspace) {
      const result = await this.playgroundWorkspacesRepository.queryByWorkspace(
        workspaceId,
        {
          page,
          limit,
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
      await this.playgroundWorkspacesRepository.listByWorkspace(workspaceId)
    )
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          (item.description ?? '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, page, limit);
  }

  async getWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundWorkspaceEntity> {
    return this.findWorkspaceById(id, workspaceId);
  }

  async updateWorkspace(
    id: string,
    input: UpdatePlaygroundWorkspaceDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundWorkspaceEntity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const workspace = await this.findWorkspaceById(id, actor.organizationId);

    if (input.title !== undefined) {
      workspace.title = input.title.trim();
    }

    if (input.description !== undefined) {
      workspace.description = input.description.trim() || undefined;
    }

    workspace.updatedAt = new Date().toISOString();
    await this.playgroundWorkspacesRepository.update(workspace);

    return workspace;
  }

  async deleteWorkspace(id: string, actor: AuthenticatedUser): Promise<void> {
    const workspace = await this.findWorkspaceById(id, actor.organizationId);

    const assets =
      await this.playgroundAssetsRepository.listByPlaygroundWorkspace(
        workspace.id,
        actor.organizationId,
      );

    for (const asset of assets) {
      this.playgroundStorageService.deleteFile(asset.storageKey);
    }

    await this.playgroundAssetsRepository.deleteByPlaygroundWorkspace(
      workspace.id,
      actor.organizationId,
    );
    await this.playgroundHypothesesRepository.deleteByPlaygroundWorkspace(
      workspace.id,
      actor.organizationId,
    );
    await this.playgroundInsightsRepository.deleteByPlaygroundWorkspace(
      workspace.id,
      actor.organizationId,
    );
    await this.playgroundWorkspacesRepository.delete(
      workspace.id,
      actor.organizationId,
    );
  }

  async uploadAsset(
    playgroundWorkspaceId: string,
    input: UploadPlaygroundAssetDto,
    file: UploadedPlaygroundFile | undefined,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundAssetEntity> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const fallbackStorageKey = this.playgroundStorageService.buildStorageKey(
      playgroundWorkspaceId,
      file.filename,
    );

    let workspace: PlaygroundWorkspaceEntity;
    try {
      workspace = await this.findWorkspaceById(
        playgroundWorkspaceId,
        actor.organizationId,
      );
    } catch (error) {
      this.playgroundStorageService.deleteFile(fallbackStorageKey);
      throw error;
    }

    const now = new Date().toISOString();
    const mimeType = file.mimetype.trim().toLowerCase();
    const storageKey = this.playgroundStorageService.buildStorageKey(
      workspace.id,
      file.filename,
    );

    const asset: PlaygroundAssetEntity = {
      id: randomUUID(),
      playgroundWorkspaceId: workspace.id,
      workspaceId: actor.organizationId,
      name: input.name?.trim() || file.originalname,
      type: this.playgroundStorageService.classifyAssetType(mimeType),
      mimeType,
      storageKey,
      fileUrl: this.playgroundStorageService.buildFileUrl(storageKey),
      uploadedBy: actor.id,
      createdAt: now,
    };

    try {
      await this.playgroundAssetsRepository.insert(asset);
    } catch (error) {
      this.playgroundStorageService.deleteFile(storageKey);
      throw error;
    }

    return asset;
  }

  async listAssets(
    playgroundWorkspaceId: string,
    query: QueryPlaygroundAssetsDto,
    workspaceId: string,
  ): Promise<PaginatedPlaygroundAssetsResult> {
    await this.findWorkspaceById(playgroundWorkspaceId, workspaceId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.playgroundAssetsRepository.queryByPlaygroundWorkspace) {
      const result =
        await this.playgroundAssetsRepository.queryByPlaygroundWorkspace(
          playgroundWorkspaceId,
          workspaceId,
          {
            page,
            limit,
            type: query.type,
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
      await this.playgroundAssetsRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      )
    )
      .filter((item) => {
        if (!query.type) {
          return true;
        }

        return item.type === query.type;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        return item.name.toLowerCase().includes(query.search.toLowerCase());
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return this.paginate(filtered, page, limit);
  }

  async createHypothesis(
    playgroundWorkspaceId: string,
    input: CreatePlaygroundHypothesisDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundHypothesisEntity> {
    const workspace = await this.findWorkspaceById(
      playgroundWorkspaceId,
      actor.organizationId,
    );
    const evidenceAssetIds = this.uniqueValues(input.evidenceAssetIds);

    await this.ensureAssetLinksBelongToWorkspace(
      workspace.id,
      actor.organizationId,
      evidenceAssetIds,
    );

    const now = new Date().toISOString();

    const hypothesis: PlaygroundHypothesisEntity = {
      id: randomUUID(),
      playgroundWorkspaceId: workspace.id,
      workspaceId: actor.organizationId,
      statement: input.statement.trim(),
      description: input.description?.trim() || undefined,
      status: input.status ?? PlaygroundHypothesisStatus.Open,
      confidence: input.confidence ?? 50,
      evidenceAssetIds,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.playgroundHypothesesRepository.insert(hypothesis);
    return hypothesis;
  }

  async listHypotheses(
    playgroundWorkspaceId: string,
    query: QueryPlaygroundHypothesesDto,
    workspaceId: string,
  ): Promise<PaginatedPlaygroundHypothesesResult> {
    await this.findWorkspaceById(playgroundWorkspaceId, workspaceId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.playgroundHypothesesRepository.queryByPlaygroundWorkspace) {
      const result =
        await this.playgroundHypothesesRepository.queryByPlaygroundWorkspace(
          playgroundWorkspaceId,
          workspaceId,
          {
            page,
            limit,
            status: query.status,
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
      await this.playgroundHypothesesRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      )
    )
      .filter((item) => {
        if (!query.status) {
          return true;
        }

        return item.status === query.status;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.statement.toLowerCase().includes(search) ||
          (item.description ?? '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return this.paginate(filtered, page, limit);
  }

  async getHypothesis(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity> {
    return this.findHypothesisById(id, workspaceId);
  }

  async updateHypothesis(
    id: string,
    input: UpdatePlaygroundHypothesisDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundHypothesisEntity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const hypothesis = await this.findHypothesisById(id, actor.organizationId);

    if (input.statement !== undefined) {
      hypothesis.statement = input.statement.trim();
    }

    if (input.description !== undefined) {
      hypothesis.description = input.description.trim() || undefined;
    }

    if (input.status !== undefined) {
      hypothesis.status = input.status;
    }

    if (input.confidence !== undefined) {
      hypothesis.confidence = input.confidence;
    }

    if (input.evidenceAssetIds !== undefined) {
      const evidenceAssetIds = this.uniqueValues(input.evidenceAssetIds);
      await this.ensureAssetLinksBelongToWorkspace(
        hypothesis.playgroundWorkspaceId,
        actor.organizationId,
        evidenceAssetIds,
      );
      hypothesis.evidenceAssetIds = evidenceAssetIds;
    }

    hypothesis.updatedAt = new Date().toISOString();
    await this.playgroundHypothesesRepository.update(hypothesis);

    return hypothesis;
  }

  async deleteHypothesis(id: string, actor: AuthenticatedUser): Promise<void> {
    const hypothesis = await this.findHypothesisById(id, actor.organizationId);

    await this.playgroundHypothesesRepository.delete(id, actor.organizationId);
    await this.removeHypothesisReferenceFromInsights(
      hypothesis.playgroundWorkspaceId,
      actor.organizationId,
      hypothesis.id,
    );
  }

  async createInsight(
    playgroundWorkspaceId: string,
    input: CreatePlaygroundInsightDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundInsightEntity> {
    const workspace = await this.findWorkspaceById(
      playgroundWorkspaceId,
      actor.organizationId,
    );

    const evidenceAssetIds = this.uniqueValues(input.evidenceAssetIds);
    const relatedHypothesisIds = this.uniqueValues(input.relatedHypothesisIds);

    await this.ensureAssetLinksBelongToWorkspace(
      workspace.id,
      actor.organizationId,
      evidenceAssetIds,
    );
    await this.ensureHypothesisLinksBelongToWorkspace(
      workspace.id,
      actor.organizationId,
      relatedHypothesisIds,
    );

    const now = new Date().toISOString();

    const insight: PlaygroundInsightEntity = {
      id: randomUUID(),
      playgroundWorkspaceId: workspace.id,
      workspaceId: actor.organizationId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      type: input.type,
      importance: input.importance ?? 50,
      isPinned: input.isPinned ?? false,
      sortOrder: input.sortOrder ?? 0,
      evidenceAssetIds,
      relatedHypothesisIds,
      requestIds: [],
      metadata: input.metadata,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.playgroundInsightsRepository.insert(insight);
    return insight;
  }

  async listInsights(
    playgroundWorkspaceId: string,
    query: QueryPlaygroundInsightsDto,
    workspaceId: string,
  ): Promise<PaginatedPlaygroundInsightsResult> {
    await this.findWorkspaceById(playgroundWorkspaceId, workspaceId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.playgroundInsightsRepository.queryByPlaygroundWorkspace) {
      const result =
        await this.playgroundInsightsRepository.queryByPlaygroundWorkspace(
          playgroundWorkspaceId,
          workspaceId,
          {
            page,
            limit,
            type: query.type,
            pinnedOnly: query.pinnedOnly,
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
      await this.playgroundInsightsRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      )
    )
      .filter((item) => {
        if (!query.type) {
          return true;
        }

        return item.type === query.type;
      })
      .filter((item) => {
        if (query.pinnedOnly !== true) {
          return true;
        }

        return item.isPinned;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          item.summary.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return b.updatedAt.localeCompare(a.updatedAt);
      });

    return this.paginate(filtered, page, limit);
  }

  async listLegacyNodes(
    playgroundWorkspaceId: string,
    query: QueryLegacyPlaygroundNodesDto,
    workspaceId: string,
  ): Promise<PaginatedLegacyPlaygroundNodesResult> {
    const result = await this.listInsights(
      playgroundWorkspaceId,
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
      },
      workspaceId,
    );

    return {
      items: result.items.map((item) => this.toLegacyNode(item)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  async createLegacyNode(
    playgroundWorkspaceId: string,
    input: CreateLegacyPlaygroundNodeDto,
    actor: AuthenticatedUser,
  ): Promise<LegacyPlaygroundNode> {
    const insight = await this.createInsight(
      playgroundWorkspaceId,
      {
        title: input.title,
        summary: input.content ?? input.title,
        type: this.mapLegacyNodeType(input.type),
        evidenceAssetIds: input.linkedAssetId ? [input.linkedAssetId] : [],
        importance: this.readNumberMetadata(input.metadata, 'importance'),
        isPinned: this.readBooleanMetadata(input.metadata, 'isPinned'),
        sortOrder: this.readNumberMetadata(input.metadata, 'sortOrder'),
        relatedHypothesisIds: this.readStringArrayMetadata(
          input.metadata,
          'relatedHypothesisIds',
        ),
        metadata: input.metadata,
      },
      actor,
    );

    return this.toLegacyNode(insight);
  }

  async updateLegacyNode(
    nodeId: string,
    input: UpdateLegacyPlaygroundNodeDto,
    actor: AuthenticatedUser,
  ): Promise<LegacyPlaygroundNode> {
    const updateInput: UpdatePlaygroundInsightDto = {};

    if (input.title !== undefined) {
      updateInput.title = input.title;
    }

    if (input.content !== undefined) {
      updateInput.summary = input.content;
    }

    if (input.type !== undefined) {
      updateInput.type = this.mapLegacyNodeType(input.type);
    }

    if (input.linkedAssetId !== undefined) {
      updateInput.evidenceAssetIds = input.linkedAssetId
        ? [input.linkedAssetId]
        : [];
    }

    const importance = this.readNumberMetadata(input.metadata, 'importance');
    if (importance !== undefined) {
      updateInput.importance = importance;
    }

    const isPinned = this.readBooleanMetadata(input.metadata, 'isPinned');
    if (isPinned !== undefined) {
      updateInput.isPinned = isPinned;
    }

    const sortOrder = this.readNumberMetadata(input.metadata, 'sortOrder');
    if (sortOrder !== undefined) {
      updateInput.sortOrder = sortOrder;
    }

    const relatedHypothesisIds = this.readStringArrayMetadata(
      input.metadata,
      'relatedHypothesisIds',
    );
    if (relatedHypothesisIds !== undefined) {
      updateInput.relatedHypothesisIds = relatedHypothesisIds;
    }

    if (input.metadata !== undefined) {
      updateInput.metadata = input.metadata;
    }

    const insight = await this.updateInsight(nodeId, updateInput, actor);
    return this.toLegacyNode(insight);
  }

  async deleteLegacyNode(
    nodeId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteInsight(nodeId, actor);
  }

  async listLegacyBoardCards(
    playgroundWorkspaceId: string,
    query: QueryPlaygroundHypothesesDto,
    workspaceId: string,
  ): Promise<PaginatedLegacyPlaygroundBoardCardsResult> {
    const result = await this.listHypotheses(
      playgroundWorkspaceId,
      query,
      workspaceId,
    );

    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.statement,
        description: item.description,
        status: item.status,
        confidence: item.confidence,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    };
  }

  async getInsight(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity> {
    return this.findInsightById(id, workspaceId);
  }

  async listInsightRequests(
    insightId: string,
    workspaceId: string,
  ): Promise<RequestEntity[]> {
    const insight = await this.findInsightById(insightId, workspaceId);
    const requestIds = this.uniqueValues(insight.requestIds);

    if (requestIds.length === 0) {
      return [];
    }

    const requests = await Promise.all(
      requestIds.map(async (requestId) => {
        try {
          return await this.requestsService.findOneById(requestId, workspaceId);
        } catch {
          return undefined;
        }
      }),
    );

    return requests.filter((item): item is RequestEntity => Boolean(item));
  }

  async promoteInsightToRequest(
    playgroundWorkspaceId: string,
    insightId: string,
    input: PromotePlaygroundInsightToRequestDto,
    actor: AuthenticatedUser,
  ): Promise<PromotePlaygroundInsightResult> {
    const workspace = await this.findWorkspaceById(
      playgroundWorkspaceId,
      actor.organizationId,
    );
    const insight = await this.findInsightById(insightId, actor.organizationId);

    if (insight.playgroundWorkspaceId !== workspace.id) {
      throw new BadRequestException(
        'Insight does not belong to this playground workspace.',
      );
    }

    const selectedHypothesisIds = this.uniqueValues(
      input.hypothesisIds ?? insight.relatedHypothesisIds,
    );

    await this.ensureHypothesisLinksBelongToWorkspace(
      workspace.id,
      actor.organizationId,
      selectedHypothesisIds,
    );

    const selectedHypotheses = await Promise.all(
      selectedHypothesisIds.map((hypothesisId) =>
        this.findHypothesisById(hypothesisId, actor.organizationId),
      ),
    );

    const includeHypothesisStatements =
      input.includeHypothesisStatements !== false;

    const requestInput: CreateRequestInput = {
      title: input.title?.trim() || insight.title,
      description: input.description?.trim() || insight.summary,
      status: input.status ?? RequestStatus.New,
      customerIds: this.uniqueValues(input.customerIds).slice(0, 200),
      companyIds: this.uniqueValues(input.companyIds).slice(0, 200),
      tags: this.uniqueValues([...(input.tags ?? []), 'playground']).slice(
        0,
        10,
      ),
      product: input.product?.trim() || undefined,
      functionality: input.functionality?.trim() || undefined,
      problems: this.uniqueValues([
        ...(input.problems ?? []),
        ...(includeHypothesisStatements
          ? selectedHypotheses.map((item) => item.statement)
          : []),
      ]).slice(0, 100),
      solutions: this.uniqueValues(input.solutions).slice(0, 100),
      sourceType: RequestSourceType.Manual,
      sourceRef: `playground-insight:${insight.id}`,
    };

    const request = await this.requestsService.create(requestInput, actor);

    if (!insight.requestIds.includes(request.id)) {
      insight.requestIds.push(request.id);
      insight.updatedAt = new Date().toISOString();
      await this.playgroundInsightsRepository.update(insight);
    }

    return {
      insight,
      request,
    };
  }

  async updateInsight(
    id: string,
    input: UpdatePlaygroundInsightDto,
    actor: AuthenticatedUser,
  ): Promise<PlaygroundInsightEntity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const insight = await this.findInsightById(id, actor.organizationId);

    if (input.title !== undefined) {
      insight.title = input.title.trim();
    }

    if (input.summary !== undefined) {
      insight.summary = input.summary.trim();
    }

    if (input.type !== undefined) {
      insight.type = input.type;
    }

    if (input.importance !== undefined) {
      insight.importance = input.importance;
    }

    if (input.isPinned !== undefined) {
      insight.isPinned = input.isPinned;
    }

    if (input.sortOrder !== undefined) {
      insight.sortOrder = input.sortOrder;
    }

    if (input.evidenceAssetIds !== undefined) {
      const evidenceAssetIds = this.uniqueValues(input.evidenceAssetIds);
      await this.ensureAssetLinksBelongToWorkspace(
        insight.playgroundWorkspaceId,
        actor.organizationId,
        evidenceAssetIds,
      );
      insight.evidenceAssetIds = evidenceAssetIds;
    }

    if (input.relatedHypothesisIds !== undefined) {
      const relatedHypothesisIds = this.uniqueValues(
        input.relatedHypothesisIds,
      );
      await this.ensureHypothesisLinksBelongToWorkspace(
        insight.playgroundWorkspaceId,
        actor.organizationId,
        relatedHypothesisIds,
      );
      insight.relatedHypothesisIds = relatedHypothesisIds;
    }

    if (input.metadata !== undefined) {
      insight.metadata = input.metadata;
    }

    insight.updatedAt = new Date().toISOString();
    await this.playgroundInsightsRepository.update(insight);

    return insight;
  }

  async deleteInsight(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findInsightById(id, actor.organizationId);
    await this.playgroundInsightsRepository.delete(id, actor.organizationId);
  }

  async deleteAsset(id: string, actor: AuthenticatedUser): Promise<void> {
    const asset = await this.findAssetById(id, actor.organizationId);

    await this.playgroundAssetsRepository.delete(id, actor.organizationId);
    this.playgroundStorageService.deleteFile(asset.storageKey);
    await this.removeAssetReferenceFromHypotheses(
      asset.playgroundWorkspaceId,
      actor.organizationId,
      asset.id,
    );
    await this.removeAssetReferenceFromInsights(
      asset.playgroundWorkspaceId,
      actor.organizationId,
      asset.id,
    );
  }

  private async findWorkspaceById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundWorkspaceEntity> {
    const workspace = await this.playgroundWorkspacesRepository.findById(
      id,
      workspaceId,
    );

    if (!workspace) {
      throw new NotFoundException('Playground workspace not found.');
    }

    return workspace;
  }

  private async findAssetById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundAssetEntity> {
    const asset = await this.playgroundAssetsRepository.findById(
      id,
      workspaceId,
    );

    if (!asset) {
      throw new NotFoundException('Playground asset not found.');
    }

    return asset;
  }

  private async findHypothesisById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundHypothesisEntity> {
    const hypothesis = await this.playgroundHypothesesRepository.findById(
      id,
      workspaceId,
    );

    if (!hypothesis) {
      throw new NotFoundException('Playground hypothesis not found.');
    }

    return hypothesis;
  }

  private async findInsightById(
    id: string,
    workspaceId: string,
  ): Promise<PlaygroundInsightEntity> {
    const insight = await this.playgroundInsightsRepository.findById(
      id,
      workspaceId,
    );

    if (!insight) {
      throw new NotFoundException('Playground insight not found.');
    }

    return {
      ...insight,
      evidenceAssetIds: insight.evidenceAssetIds ?? [],
      relatedHypothesisIds: insight.relatedHypothesisIds ?? [],
      requestIds: insight.requestIds ?? [],
    };
  }

  private async ensureAssetLinksBelongToWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
    assetIds: string[],
  ): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }

    const checks = assetIds.map(async (assetId) => {
      const asset = await this.playgroundAssetsRepository.findById(
        assetId,
        workspaceId,
      );

      if (!asset || asset.playgroundWorkspaceId !== playgroundWorkspaceId) {
        throw new BadRequestException(
          'One or more evidenceAssetIds are invalid for this workspace.',
        );
      }
    });

    await Promise.all(checks);
  }

  private async ensureHypothesisLinksBelongToWorkspace(
    playgroundWorkspaceId: string,
    workspaceId: string,
    hypothesisIds: string[],
  ): Promise<void> {
    if (hypothesisIds.length === 0) {
      return;
    }

    const checks = hypothesisIds.map(async (hypothesisId) => {
      const hypothesis = await this.playgroundHypothesesRepository.findById(
        hypothesisId,
        workspaceId,
      );

      if (
        !hypothesis ||
        hypothesis.playgroundWorkspaceId !== playgroundWorkspaceId
      ) {
        throw new BadRequestException(
          'One or more relatedHypothesisIds are invalid for this workspace.',
        );
      }
    });

    await Promise.all(checks);
  }

  private async removeAssetReferenceFromHypotheses(
    playgroundWorkspaceId: string,
    workspaceId: string,
    assetId: string,
  ): Promise<void> {
    const hypotheses =
      await this.playgroundHypothesesRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      );

    const updates = hypotheses
      .filter((item) => item.evidenceAssetIds.includes(assetId))
      .map(async (item) => {
        item.evidenceAssetIds = item.evidenceAssetIds.filter(
          (id) => id !== assetId,
        );
        item.updatedAt = new Date().toISOString();
        await this.playgroundHypothesesRepository.update(item);
      });

    await Promise.all(updates);
  }

  private async removeAssetReferenceFromInsights(
    playgroundWorkspaceId: string,
    workspaceId: string,
    assetId: string,
  ): Promise<void> {
    const insights =
      await this.playgroundInsightsRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      );

    const updates = insights
      .filter((item) => item.evidenceAssetIds.includes(assetId))
      .map(async (item) => {
        item.evidenceAssetIds = item.evidenceAssetIds.filter(
          (id) => id !== assetId,
        );
        item.updatedAt = new Date().toISOString();
        await this.playgroundInsightsRepository.update(item);
      });

    await Promise.all(updates);
  }

  private async removeHypothesisReferenceFromInsights(
    playgroundWorkspaceId: string,
    workspaceId: string,
    hypothesisId: string,
  ): Promise<void> {
    const insights =
      await this.playgroundInsightsRepository.listByPlaygroundWorkspace(
        playgroundWorkspaceId,
        workspaceId,
      );

    const updates = insights
      .filter((item) => item.relatedHypothesisIds.includes(hypothesisId))
      .map(async (item) => {
        item.relatedHypothesisIds = item.relatedHypothesisIds.filter(
          (id) => id !== hypothesisId,
        );
        item.updatedAt = new Date().toISOString();
        await this.playgroundInsightsRepository.update(item);
      });

    await Promise.all(updates);
  }

  private toLegacyNode(insight: PlaygroundInsightEntity): LegacyPlaygroundNode {
    return {
      id: insight.id,
      type: insight.type,
      title: insight.title,
      content: insight.summary,
      linkedAssetId: insight.evidenceAssetIds[0],
      metadata: {
        importance: insight.importance,
        isPinned: insight.isPinned,
        sortOrder: insight.sortOrder,
        relatedHypothesisIds: insight.relatedHypothesisIds,
        requestIds: insight.requestIds,
        // Preservar metadata customizada (ex: shape properties)
        ...(insight.metadata || {}),
      },
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }

  private mapLegacyNodeType(type: string): PlaygroundInsightType {
    const normalized = type.trim().toLowerCase();

    // Tipos estruturados
    if (normalized === 'pain_point' || normalized === 'problem') {
      return PlaygroundInsightType.PainPoint;
    }

    if (normalized === 'behavior' || normalized === 'note') {
      return PlaygroundInsightType.Behavior;
    }

    if (normalized === 'risk') {
      return PlaygroundInsightType.Risk;
    }

    if (
      normalized === 'opportunity' ||
      normalized === 'solution' ||
      normalized === 'insight'
    ) {
      return PlaygroundInsightType.Opportunity;
    }

    // Tipos de desenho/texto livre (novos)
    if (normalized === 'text') {
      return PlaygroundInsightType.Text;
    }

    if (normalized === 'shape') {
      return PlaygroundInsightType.Shape;
    }

    // Evidence também mapeia para opportunity por padrão
    if (normalized === 'evidence') {
      return PlaygroundInsightType.Opportunity;
    }

    // Fallback para opportunity
    return PlaygroundInsightType.Opportunity;
  }

  private readNumberMetadata(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): number | undefined {
    const value = metadata?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    return undefined;
  }

  private readBooleanMetadata(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): boolean | undefined {
    const value = metadata?.[key];
    if (typeof value === 'boolean') {
      return value;
    }

    return undefined;
  }

  private readStringArrayMetadata(
    metadata: Record<string, unknown> | undefined,
    key: string,
  ): string[] | undefined {
    const value = metadata?.[key];
    if (!Array.isArray(value)) {
      return undefined;
    }

    const normalized = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (normalized.length === 0) {
      return [];
    }

    return this.uniqueValues(normalized);
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

  private paginate<T>(items: T[], page: number, limit: number) {
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
