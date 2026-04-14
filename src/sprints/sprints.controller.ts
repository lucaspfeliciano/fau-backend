import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
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
import { CreateSprintDto } from './dto/create-sprint.dto';
import { QuerySprintsDto } from './dto/query-sprints.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { SprintsService } from './sprints.service';

@ApiTags('Sprints')
@ApiBearerAuth()
@Controller('sprints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create sprint' })
  @ApiBody({
    schema: {
      example: {
        initiativeId: 'initiative-1',
        name: 'Sprint 24',
        status: 'planned',
        eta: '2026-05-15',
        squad: 'squad-growth',
        externalLinearSprintId: 'linear-sprint-987',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Sprint created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateSprintDto,
  ) {
    return {
      sprint: await this.sprintsService.create(body, user),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List sprints with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated sprints.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QuerySprintsDto,
  ) {
    return this.sprintsService.list(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint by id' })
  @ApiParam({ name: 'id', description: 'Sprint id' })
  @ApiOkResponse({ description: 'Returns sprint by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      sprint: await this.sprintsService.findOneById(id, user.organizationId),
    };
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update sprint by id' })
  @ApiParam({ name: 'id', description: 'Sprint id' })
  @ApiBody({
    schema: {
      example: {
        status: 'in_progress',
        eta: '2026-05-20',
      },
    },
  })
  @ApiOkResponse({ description: 'Sprint updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateSprintDto,
  ) {
    return {
      sprint: await this.sprintsService.update(id, body, user),
    };
  }
}
