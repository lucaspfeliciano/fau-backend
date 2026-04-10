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
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { CreateRequestSchema } from './dto/create-request.schema';
import { QueryRequestsSchema } from './dto/query-requests.schema';
import { UpdateRequestSchema } from './dto/update-request.schema';
import { RequestsService } from './requests.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestInput } from './dto/create-request.schema';
import type { QueryRequestsInput } from './dto/query-requests.schema';
import type { UpdateRequestInput } from './dto/update-request.schema';

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create request' })
  @ApiBody({
    schema: {
      example: {
        title: 'Need dark mode',
        description: 'Customers requested dark mode in dashboard.',
        tags: ['ui', 'dashboard'],
        sourceType: 'manual',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Request created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRequestSchema)) body: CreateRequestInput,
  ) {
    return {
      request: this.requestsService.create(body, user),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List requests with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated requests.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRequestsSchema))
    query: QueryRequestsInput,
  ) {
    return this.requestsService.list(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request by id' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns request by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      request: this.requestsService.findOneById(id, user.organizationId),
    };
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update request by id' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiBody({
    schema: {
      example: {
        status: 'Planned',
        tags: ['ui', 'priority-high'],
      },
    },
  })
  @ApiOkResponse({ description: 'Request updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRequestSchema)) body: UpdateRequestInput,
  ) {
    return {
      request: this.requestsService.update(id, body, user),
    };
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Soft delete request by id' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Request archived successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      request: this.requestsService.archive(id, user),
    };
  }

  @Post(':id/vote')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Increment request votes' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiCreatedResponse({ description: 'Vote registered successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  vote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      request: this.requestsService.vote(id, user),
    };
  }
}
