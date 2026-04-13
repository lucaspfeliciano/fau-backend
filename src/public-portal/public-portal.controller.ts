import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
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
  QueryRoadmapItemsSchema,
  type QueryRoadmapItemsInput,
} from '../roadmap/dto/query-roadmap-items.schema';
import {
  QueryRequestsSchema,
  type QueryRequestsInput,
} from '../requests/dto/query-requests.schema';
import {
  CreatePublicCommentSchema,
  type CreatePublicCommentInput,
} from './dto/create-public-comment.schema';
import {
  CreatePublicRequestSchema,
  type CreatePublicRequestInput,
} from './dto/create-public-request.schema';
import {
  CreatePublicVoteSchema,
  type CreatePublicVoteInput,
} from './dto/create-public-vote.schema';
import { PublicPortalService } from './public-portal.service';

@ApiTags('Public Portal')
@Controller('public')
export class PublicPortalController {
  constructor(private readonly publicPortalService: PublicPortalService) {}

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

  @Post(':workspaceSlug/requests')
  @ApiOperation({ summary: 'Submit public feedback request by workspace slug' })
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
  @ApiCreatedResponse({ description: 'Public feedback submitted.' })
  createRequest(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(CreatePublicRequestSchema))
    body: CreatePublicRequestInput,
  ) {
    return this.publicPortalService.createRequest(workspaceSlug, body);
  }

  @Post(':workspaceSlug/votes')
  @ApiOperation({ summary: 'Vote on a public feedback request' })
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

  @Get(':workspaceSlug/roadmap')
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

  @Get(':workspaceSlug/changelog')
  @ApiOperation({ summary: 'List public changelog by workspace slug' })
  @ApiParam({ name: 'workspaceSlug', description: 'Workspace slug' })
  @ApiOkResponse({ description: 'Returns published releases for workspace.' })
  listChangelog(@Param('workspaceSlug') workspaceSlug: string) {
    return this.publicPortalService.listChangelog(workspaceSlug);
  }
}
