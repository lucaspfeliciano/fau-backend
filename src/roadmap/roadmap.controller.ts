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
import { RoadmapService } from './roadmap.service';

@ApiTags('Roadmap')
@ApiBearerAuth()
@Controller('roadmap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get('items')
  @ApiOperation({ summary: 'List roadmap items with filters and sorting' })
  @ApiOkResponse({ description: 'Returns paginated roadmap items.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
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
