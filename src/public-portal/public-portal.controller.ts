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
  CreatePublicRequestSchema,
  type CreatePublicRequestInput,
} from './dto/create-public-request.schema';
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
    @Query('sessionId') sessionId?: string,
  ): Promise<PublicFeedbackItem> {
    return this.publicPortalService.getFeedback(
      workspaceSlug,
      feedbackId,
      sessionId,
    );
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

  @Post(':workspaceSlug/feedbacks/similar')
  @ApiOperation({ summary: 'Find similar feedbacks by title/details' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiCreatedResponse({ description: 'Similar feedbacks returned.' })
  findSimilarFeedbacks(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(FindSimilarPublicRequestsSchema))
    body: FindSimilarPublicRequestsInput,
  ) {
    return this.publicPortalService.findSimilarFeedbacks(workspaceSlug, {
      title: body.title,
      details: body.details,
    });
  }

  @Get(':workspaceSlug/feedbacks/:feedbackId/comments')
  @ApiOperation({ summary: 'List comments for a public feedback' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback id' })
  @ApiOkResponse({ description: 'Returns comments for feedback.' })
  listFeedbackComments(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('feedbackId') feedbackId: string,
  ) {
    return this.publicPortalService.listFeedbackComments(
      workspaceSlug,
      feedbackId,
    );
  }

  @Post(':workspaceSlug/feedbacks/:feedbackId/comments')
  @ApiOperation({ summary: 'Add comment to a public feedback' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback id' })
  @ApiCreatedResponse({ description: 'Comment added to feedback.' })
  addFeedbackComment(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('feedbackId') feedbackId: string,
    @Body(new ZodValidationPipe(CreatePublicRequestPathCommentSchema))
    body: CreatePublicRequestPathCommentInput,
  ) {
    return this.publicPortalService.addFeedbackComment(
      workspaceSlug,
      feedbackId,
      {
        text: body.text,
        name: body.name,
      },
    );
  }

  // Other routes
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
