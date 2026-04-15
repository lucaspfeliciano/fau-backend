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
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  CreateRoadmapViewSchema,
  type CreateRoadmapViewInput,
} from './dto/create-roadmap-view.schema';
import {
  QueryRoadmapViewsSchema,
  type QueryRoadmapViewsInput,
} from './dto/query-roadmap-views.schema';
import {
  UpdateRoadmapViewSchema,
  type UpdateRoadmapViewInput,
} from './dto/update-roadmap-view.schema';
import { RoadmapService } from './roadmap.service';

@ApiTags('Requests Views')
@ApiBearerAuth()
@Controller('requests/views')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsViewsController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get()
  @ApiOperation({ summary: 'List saved request views' })
  @ApiOkResponse({ description: 'Returns paginated request views.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRoadmapViewsSchema))
    query: QueryRoadmapViewsInput,
  ) {
    return this.roadmapService.listViews(query, user);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create saved request view' })
  @ApiBody({
    schema: {
      example: {
        name: 'Requests by board',
        visibility: 'role',
        filters: {
          board: 'product',
        },
        sort: {
          sortBy: 'score',
          sortOrder: 'desc',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Request view created.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRoadmapViewSchema))
    body: CreateRoadmapViewInput,
  ) {
    return {
      view: await this.roadmapService.createView(body, user),
    };
  }

  @Patch(':viewId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update saved request view' })
  @ApiParam({ name: 'viewId', description: 'View id' })
  @ApiOkResponse({ description: 'Request view updated.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('viewId') viewId: string,
    @Body(new ZodValidationPipe(UpdateRoadmapViewSchema))
    body: UpdateRoadmapViewInput,
  ) {
    return {
      view: await this.roadmapService.updateView(viewId, body, user),
    };
  }

  @Delete(':viewId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Delete saved request view' })
  @ApiParam({ name: 'viewId', description: 'View id' })
  @ApiOkResponse({ description: 'Request view deleted.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('viewId') viewId: string,
  ) {
    await this.roadmapService.deleteView(viewId, user);

    return {
      deleted: true,
    };
  }
}
