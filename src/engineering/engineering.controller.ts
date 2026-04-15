import {
  Body,
  Controller,
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
  CreateSprintSchema,
  type CreateSprintInput,
} from './dto/create-sprint.schema';
import {
  CreateTaskSchema,
  type CreateTaskInput,
} from './dto/create-task.schema';
import {
  QuerySprintsSchema,
  type QuerySprintsInput,
} from './dto/query-sprints.schema';
import {
  QueryTasksSchema,
  type QueryTasksInput,
} from './dto/query-tasks.schema';
import {
  UpdateSprintSchema,
  type UpdateSprintInput,
} from './dto/update-sprint.schema';
import {
  UpdateTaskSchema,
  type UpdateTaskInput,
} from './dto/update-task.schema';
import { EngineeringService } from './engineering.service';

@ApiTags('Engineering')
@ApiBearerAuth()
@Controller('engineering')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineeringController {
  constructor(private readonly engineeringService: EngineeringService) {}

  @Post('sprints')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create sprint' })
  @ApiBody({
    schema: {
      example: {
        name: 'Sprint 24',
        startDate: '2026-04-14T00:00:00.000Z',
        endDate: '2026-04-28T00:00:00.000Z',
        status: 'Planned',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Sprint created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateSprintSchema)) body: CreateSprintInput,
  ) {
    return {
      sprint: await this.engineeringService.createSprint(body, user),
    };
  }

  @Get('sprints')
  @ApiOperation({ summary: 'List sprints with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated sprints.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listSprints(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QuerySprintsSchema)) query: QuerySprintsInput,
  ) {
    return this.engineeringService.listSprints(query, user.organizationId);
  }

  @Get('sprints/:id')
  @ApiOperation({ summary: 'Get sprint by id' })
  @ApiParam({ name: 'id', description: 'Sprint id' })
  @ApiOkResponse({ description: 'Returns sprint by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      sprint: await this.engineeringService.getSprintById(
        id,
        user.organizationId,
      ),
    };
  }

  @Patch('sprints/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update sprint by id' })
  @ApiParam({ name: 'id', description: 'Sprint id' })
  @ApiBody({
    schema: {
      example: {
        status: 'Completed',
        closeReason: 'Roll-over approved due to prod incident.',
      },
    },
  })
  @ApiOkResponse({ description: 'Sprint updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSprintSchema)) body: UpdateSprintInput,
  ) {
    return {
      sprint: await this.engineeringService.updateSprint(id, body, user),
    };
  }

  @Get('sprints/:id/progress')
  @ApiOperation({ summary: 'Get sprint progress summary' })
  @ApiParam({ name: 'id', description: 'Sprint id' })
  @ApiOkResponse({ description: 'Returns sprint progress.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getSprintProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.engineeringService.getSprintProgress(id, user.organizationId);
  }

  @Get('sprints/:sprintId/tasks')
  @ApiOperation({ summary: 'List tasks from sprint' })
  @ApiParam({ name: 'sprintId', description: 'Sprint id' })
  @ApiOkResponse({ description: 'Returns tasks linked to sprint.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listTasksBySprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
  ) {
    return {
      items: await this.engineeringService.listTasksBySprint(
        sprintId,
        user.organizationId,
      ),
    };
  }

  @Post('tasks')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create task from feature' })
  @ApiBody({
    schema: {
      example: {
        title: 'Implement Slack channel selector',
        description: 'Allow channel mapping by account and environment.',
        featureId: 'feature-id',
        sprintId: 'sprint-id',
        estimate: 8,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Task created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateTaskSchema)) body: CreateTaskInput,
  ) {
    return {
      task: await this.engineeringService.createTask(body, user),
    };
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated tasks.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryTasksSchema)) query: QueryTasksInput,
  ) {
    return this.engineeringService.listTasks(query, user.organizationId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by id' })
  @ApiParam({ name: 'id', description: 'Task id' })
  @ApiOkResponse({ description: 'Returns task by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      task: await this.engineeringService.getTaskById(id, user.organizationId),
    };
  }

  @Patch('tasks/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update task by id' })
  @ApiParam({ name: 'id', description: 'Task id' })
  @ApiBody({
    schema: {
      example: {
        status: 'In Progress',
      },
    },
  })
  @ApiOkResponse({ description: 'Task updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) body: UpdateTaskInput,
  ) {
    return {
      task: await this.engineeringService.updateTask(id, body, user),
    };
  }

  @Post('tasks/:id/assign-sprint/:sprintId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Assign task to sprint' })
  @ApiParam({ name: 'id', description: 'Task id' })
  @ApiParam({ name: 'sprintId', description: 'Sprint id' })
  @ApiCreatedResponse({ description: 'Task assigned to sprint.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async assignSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sprintId') sprintId: string,
  ) {
    return {
      task: await this.engineeringService.assignTaskToSprint(
        id,
        sprintId,
        user,
      ),
    };
  }

  @Get('tasks/:id/traceability')
  @ApiOperation({
    summary:
      'Get task traceability (feature -> requests -> customers/companies)',
  })
  @ApiParam({ name: 'id', description: 'Task id' })
  @ApiOkResponse({ description: 'Returns task traceability graph.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getTaskTraceability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.engineeringService.getTaskTraceability(id, user.organizationId);
  }
}
