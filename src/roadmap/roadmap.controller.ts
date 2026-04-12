import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  CreateRoadmapViewSchema,
  type CreateRoadmapViewInput,
} from './dto/create-roadmap-view.schema';
import {
  QueryRoadmapItemsSchema,
  type QueryRoadmapItemsInput,
} from './dto/query-roadmap-items.schema';
import {
  QueryRoadmapViewsSchema,
  type QueryRoadmapViewsInput,
} from './dto/query-roadmap-views.schema';
import {
  UpdateRoadmapViewSchema,
  type UpdateRoadmapViewInput,
} from './dto/update-roadmap-view.schema';
import {
  RoadmapAudience,
  RoadmapEtaConfidence,
  RoadmapItemCategory,
} from './entities/roadmap-item.entity';
import {
  RoadmapGroupBy,
  RoadmapSortBy,
  RoadmapSortOrder,
} from './entities/roadmap-view.entity';
import { RoadmapService } from './roadmap.service';

@ApiTags('Roadmap')
@ApiBearerAuth()
@Controller('roadmap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get('items')
  @ApiOperation({
    summary:
      'List roadmap items with server-side filtering, sorting and pagination',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'board', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: RoadmapItemCategory })
  @ApiQuery({ name: 'owner', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'audience', required: false, enum: RoadmapAudience })
  @ApiQuery({
    name: 'etaConfidence',
    required: false,
    enum: RoadmapEtaConfidence,
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: [
      RoadmapGroupBy.None,
      RoadmapGroupBy.Status,
      RoadmapGroupBy.Owner,
      RoadmapGroupBy.Board,
      RoadmapGroupBy.EtaConfidence,
      RoadmapGroupBy.Category,
    ],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [RoadmapSortBy.Score, RoadmapSortBy.Eta, RoadmapSortBy.Impact],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: RoadmapSortOrder })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Returns paginated roadmap items.',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'requestId',
              'title',
              'post',
              'board',
              'category',
              'owner',
              'status',
              'tags',
              'score',
              'scoreBreakdown',
              'eta',
              'impact',
              'riskLevel',
              'traceability',
              'updatedAt',
            ],
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
      },
      required: ['items', 'total', 'page', 'pageSize'],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Access denied for current role.' })
  listItems(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRoadmapItemsSchema))
    query: QueryRoadmapItemsInput,
  ) {
    return this.roadmapService.listItems(query, user.organizationId);
  }

  @Get('views')
  @ApiOperation({ summary: 'List roadmap views visible to current user' })
  @ApiOkResponse({ description: 'Returns paginated roadmap views.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  listViews(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRoadmapViewsSchema))
    query: QueryRoadmapViewsInput,
  ) {
    return this.roadmapService.listViews(query, user);
  }

  @Post('views')
  @ApiOperation({ summary: 'Create roadmap view' })
  @ApiBody({
    schema: {
      example: {
        name: 'Roadmap semanal - produto',
        visibility: 'role',
        filters: {
          category: 'feature',
          status: 'Planned',
        },
        sort: {
          sortBy: 'score',
          sortOrder: 'desc',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Roadmap view created successfully.' })
  @ApiForbiddenResponse({ description: 'Insufficient role for visibility.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createView(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRoadmapViewSchema))
    body: CreateRoadmapViewInput,
  ) {
    return {
      view: await this.roadmapService.createView(body, user),
    };
  }

  @Patch('views/:id')
  @ApiOperation({ summary: 'Update roadmap view by id' })
  @ApiParam({ name: 'id', description: 'Roadmap view id' })
  @ApiBody({
    schema: {
      example: {
        name: 'Roadmap executivo',
        visibility: 'organization',
      },
    },
  })
  @ApiOkResponse({ description: 'Roadmap view updated successfully.' })
  @ApiForbiddenResponse({ description: 'Insufficient permission for update.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoadmapViewSchema))
    body: UpdateRoadmapViewInput,
  ) {
    return {
      view: await this.roadmapService.updateView(id, body, user),
    };
  }

  @Delete('views/:id')
  @ApiOperation({ summary: 'Delete roadmap view by id' })
  @ApiParam({ name: 'id', description: 'Roadmap view id' })
  @ApiOkResponse({ description: 'Roadmap view deleted successfully.' })
  @ApiForbiddenResponse({
    description: 'Insufficient permission for deletion.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async deleteView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.roadmapService.deleteView(id, user);

    return {
      deleted: true,
    };
  }
}
