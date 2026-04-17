import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  QueryPublicFeedbacksSchema,
  type QueryPublicFeedbacksInput,
} from '../feedback/dto/query-public-feedbacks.schema';
import {
  QueryRoadmapItemsSchema,
  type QueryRoadmapItemsInput,
} from '../roadmap/dto/query-roadmap-items.schema';
import {
  QueryRequestsSchema,
  type QueryRequestsInput,
} from '../requests/dto/query-requests.schema';
import {
  CreatePublicRequestPathCommentSchema,
  type CreatePublicRequestPathCommentInput,
} from './dto/create-public-request-path-comment.schema';
import {
  CreatePublicCommentSchema,
  type CreatePublicCommentInput,
} from './dto/create-public-comment.schema';
import {
  CreatePublicFeedbackVoteSchema,
  type CreatePublicFeedbackVoteInput,
} from './dto/create-public-feedback-vote.schema';
import {
  CreatePublicRequestPathVoteSchema,
  type CreatePublicRequestPathVoteInput,
} from './dto/create-public-request-path-vote.schema';
import {
  CreatePublicRequestSchema,
  type CreatePublicRequestInput,
} from './dto/create-public-request.schema';
import {
  CreatePublicVoteSchema,
  type CreatePublicVoteInput,
} from './dto/create-public-vote.schema';
import {
  FindSimilarPublicRequestsSchema,
  type FindSimilarPublicRequestsInput,
} from './dto/find-similar-public-requests.schema';
import {
  UpdatePublicWorkspaceSettingsSchema,
  type UpdatePublicWorkspaceSettingsInput,
} from './dto/update-public-workspace-settings.schema';
import {
  PublicPortalService,
  type PublicFeedbackItem,
} from './public-portal.service';

@ApiTags('Public Portal')
@Controller(['public', 'api/public'])
export class PublicPortalController {
  constructor(private readonly publicPortalService: PublicPortalService) {}

  @Get('workspaces/:workspaceSlug/settings')
  @ApiOperation({ summary: 'Get public workspace settings by slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns public workspace settings.' })
  getSettings(@Param('workspaceSlug') workspaceSlug: string) {
    return this.publicPortalService.getSettings(workspaceSlug);
  }

  @Patch('workspaces/:workspaceSlug/settings')
  @ApiOperation({ summary: 'Update public workspace settings by slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Public workspace settings updated.' })
  updateSettings(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(UpdatePublicWorkspaceSettingsSchema))
    body: UpdatePublicWorkspaceSettingsInput,
  ) {
    return this.publicPortalService.updateSettings(workspaceSlug, body);
  }

  // Feedbacks routes (must come BEFORE :workspaceSlug/requests to avoid conflicts)
  @Get(':workspaceSlug/feedbacks/:feedbackId')
  @ApiOperation({ summary: 'Get public feedback details by id' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback id' })
  @ApiOkResponse({ description: 'Returns feedback details.' })
  getFeedback(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('feedbackId') feedbackId: string,
  ): Promise<{ feedback: PublicFeedbackItem }> {
    return this.publicPortalService.getFeedback(workspaceSlug, feedbackId);
  }

  @Get(':workspaceSlug/feedbacks')
  @ApiOperation({ summary: 'List public feedbacks by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns public feedbacks list.' })
  listFeedbacks(
    @Param('workspaceSlug') workspaceSlug: string,
    @Query(new ZodValidationPipe(QueryPublicFeedbacksSchema))
    query: QueryPublicFeedbacksInput,
  ): Promise<{
    items: PublicFeedbackItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    return this.publicPortalService.listFeedbacks(workspaceSlug, query);
  }

  @Post(':workspaceSlug/feedbacks/vote')
  @ApiOperation({ summary: 'Vote on a public feedback' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiBody({
    schema: {
      example: {
        feedbackId: 'fc296fbc-1e03-49b9-aac7-aaac7871ae0f',
        sessionId: 'browser-session-123',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Public vote registered on feedback.' })
  voteFeedback(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicFeedbackVoteSchema))
    body: CreatePublicFeedbackVoteInput,
    @Req() request: Request,
  ): Promise<{ feedbackId: string; votes: number; duplicate: boolean }> {
    return this.publicPortalService.voteFeedback(
      workspaceSlug,
      body,
      request.ip,
    );
  }

  @Post(':workspaceSlug/feedbacks')
  @ApiOperation({ summary: 'Submit public raw feedback by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiBody({
    schema: {
      example: {
        title: 'Exportacao por squad nao atende diretoria',
        description:
          'Sem filtro por squad fica inviavel fechar relatorio semanal.',
        publicSubmitterName: 'Maria',
        publicSubmitterEmail: 'maria@empresa.com',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Public feedback submitted.' })
  createFeedback(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicRequestSchema))
    body: CreatePublicRequestInput,
  ) {
    return this.publicPortalService.createFeedback(workspaceSlug, body);
  }

  // Requests routes
  @Get(':workspaceSlug/requests')
  @ApiOperation({ summary: 'List public feedback requests by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns public requests list.' })
  listRequests(
    @Param('workspaceSlug') workspaceSlug: string,
    @Query(new ZodValidationPipe(QueryRequestsSchema))
    query: QueryRequestsInput,
  ) {
    return this.publicPortalService.listRequests(workspaceSlug, query);
  }

  @Get(':workspaceSlug/requests/:requestId')
  @ApiOperation({ summary: 'Get public request details by id' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns request details.' })
  getRequest(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('requestId') requestId: string,
  ) {
    return this.publicPortalService.getRequest(workspaceSlug, requestId);
  }

  @Get(':workspaceSlug/requests/:requestId/comments')
  @ApiOperation({ summary: 'List comments for public request' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns public comments list.' })
  listRequestComments(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('requestId') requestId: string,
  ) {
    return this.publicPortalService.listRequestComments(
      workspaceSlug,
      requestId,
    );
  }

  @Post(':workspaceSlug/requests/:requestId/comments')
  @ApiOperation({ summary: 'Create comment for public request' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiCreatedResponse({ description: 'Public comment created.' })
  addRequestComment(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(CreatePublicRequestPathCommentSchema))
    body: CreatePublicRequestPathCommentInput,
  ) {
    return this.publicPortalService.addCommentToRequest(
      workspaceSlug,
      requestId,
      body,
    );
  }

  @Post(':workspaceSlug/requests/:requestId/vote')
  @ApiOperation({ summary: 'Vote on public request by id' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiCreatedResponse({ description: 'Public vote registered.' })
  voteRequestById(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('requestId') requestId: string,
    @Body(new ZodValidationPipe(CreatePublicRequestPathVoteSchema))
    body: CreatePublicRequestPathVoteInput,
    @Req() request: Request,
  ) {
    return this.publicPortalService.voteOnRequest(
      workspaceSlug,
      requestId,
      body,
      request.ip,
    );
  }

  @Post(':workspaceSlug/requests/similar')
  @ApiOperation({ summary: 'Find similar public requests by title/details' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiCreatedResponse({ description: 'Similar requests returned.' })
  findSimilarRequests(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(FindSimilarPublicRequestsSchema))
    body: FindSimilarPublicRequestsInput,
  ) {
    return this.publicPortalService.findSimilarRequests(workspaceSlug, body);
  }

  @Post(':workspaceSlug/requests')
  @ApiOperation({
    summary:
      'Deprecated alias: submit public raw feedback (prefer /public/:workspaceSlug/feedbacks)',
  })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiBody({
    schema: {
      example: {
        title: 'Preciso exportar dashboard por squad',
        description: 'Hoje exporta sem filtro e fica inviavel para diretoria.',
        publicSubmitterName: 'Maria',
        publicSubmitterEmail: 'maria@empresa.com',
        tags: ['dashboard', 'export'],
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Public feedback submitted. This legacy route is deprecated in favor of /feedbacks.',
  })
  createRequest(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicRequestSchema))
    body: CreatePublicRequestInput,
  ) {
    return this.publicPortalService.createRequest(workspaceSlug, body);
  }

  // Other routes
  @Post(':workspaceSlug/votes')
  @ApiOperation({
    summary: 'Vote on a public request (deprecated - use /feedbacks/vote)',
  })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiBody({
    schema: {
      example: {
        requestId: 'fc296fbc-1e03-49b9-aac7-aaac7871ae0f',
        sessionId: 'browser-session-123',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Public vote registered.' })
  voteRequest(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicVoteSchema))
    body: CreatePublicVoteInput,
    @Req() request: Request,
  ) {
    return this.publicPortalService.voteRequest(
      workspaceSlug,
      body,
      request.ip,
    );
  }

  @Post(':workspaceSlug/comments')
  @ApiOperation({ summary: 'Post public comment in a request timeline' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiBody({
    schema: {
      example: {
        requestId: 'fc296fbc-1e03-49b9-aac7-aaac7871ae0f',
        text: 'Temos o mesmo problema no time de CS.',
        publicAuthorName: 'Joao',
        publicAuthorEmail: 'joao@empresa.com',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Public comment created.' })
  addComment(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicCommentSchema))
    body: CreatePublicCommentInput,
  ) {
    return this.publicPortalService.addComment(workspaceSlug, body);
  }

  @Get(':workspaceSlug/roadmaps')
  @ApiOperation({ summary: 'List public roadmap by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns public roadmap items.' })
  listRoadmap(
    @Param('workspaceSlug') workspaceSlug: string,
    @Query(new ZodValidationPipe(QueryRoadmapItemsSchema))
    query: QueryRoadmapItemsInput,
  ) {
    return this.publicPortalService.listRoadmap(workspaceSlug, query);
  }

  @Get(':workspaceSlug/changelogs')
  @ApiOperation({ summary: 'List public changelog by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns published releases for workspace.' })
  listChangelog(@Param('workspaceSlug') workspaceSlug: string) {
    return this.publicPortalService.listChangelog(workspaceSlug);
  }
}
