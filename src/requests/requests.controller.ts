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
import { CreateRequestCommentSchema } from './dto/create-request-comment.schema';
import { CreateRequestSchema } from './dto/create-request.schema';
import { FindSimilarRequestsSchema } from './dto/find-similar-requests.schema';
import { QueryRequestsSchema } from './dto/query-requests.schema';
import { UpdateRequestSchema } from './dto/update-request.schema';
import { RequestsService } from './requests.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateRequestCommentInput } from './dto/create-request-comment.schema';
import type { CreateRequestInput } from './dto/create-request.schema';
import type { FindSimilarRequestsInput } from './dto/find-similar-requests.schema';
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
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRequestSchema)) body: CreateRequestInput,
  ) {
    return {
      request: await this.requestsService.create(body, user),
    };
  }

  @Post('similar')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Find similar requests before creation' })
  @ApiBody({
    schema: {
      example: {
        title: 'Melhorar dashboard de equipe',
        details: 'Cliente pediu dashboard por equipe com filtro por squad.',
        boardId: 'board-1',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Similar requests returned successfully.',
  })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  findSimilar(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(FindSimilarRequestsSchema))
    body: FindSimilarRequestsInput,
  ) {
    return this.requestsService.findSimilarRequests(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List requests with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated requests.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
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
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      request: await this.requestsService.findOneById(id, user.organizationId),
    };
  }

  @Get(':id/updates')
  @ApiOperation({ summary: 'Get request updates history' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns request updates history.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getUpdates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.requestsService.getRequestUpdates(id, user.organizationId);
  }

  @Post(':id/comments')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Add comment to request timeline' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiBody({
    schema: {
      example: {
        comment: 'Cliente confirmou prioridade alta para o proximo ciclo.',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Comment added successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateRequestCommentSchema))
    body: CreateRequestCommentInput,
  ) {
    return {
      comment: await this.requestsService.addComment(id, body, user),
    };
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List request comments' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns request comments list.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      items: await this.requestsService.listComments(id, user.organizationId),
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
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRequestSchema)) body: UpdateRequestInput,
  ) {
    return {
      request: await this.requestsService.update(id, body, user),
    };
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Soft delete request by id' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Request archived successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      request: await this.requestsService.archive(id, user),
    };
  }

  @Post(':id/vote')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Increment request votes' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiCreatedResponse({ description: 'Vote registered successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async vote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      request: await this.requestsService.vote(id, user),
    };
  }

  @Post(':id/customers/:customerId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Link customer to request' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiParam({ name: 'customerId', description: 'Customer id' })
  @ApiCreatedResponse({ description: 'Customer linked to request.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async linkCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
  ) {
    return {
      request: await this.requestsService.linkCustomer(id, customerId, user),
    };
  }

  @Delete(':id/customers/:customerId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Unlink customer from request' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiParam({ name: 'customerId', description: 'Customer id' })
  @ApiOkResponse({ description: 'Customer unlinked from request.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async unlinkCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('customerId') customerId: string,
  ) {
    return {
      request: await this.requestsService.unlinkCustomer(id, customerId, user),
    };
  }

  @Post(':id/companies/:companyId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Link company to request' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiParam({ name: 'companyId', description: 'Company id' })
  @ApiCreatedResponse({ description: 'Company linked to request.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async linkCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('companyId') companyId: string,
  ) {
    return {
      request: await this.requestsService.linkCompany(id, companyId, user),
    };
  }

  @Delete(':id/companies/:companyId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Unlink company from request' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiParam({ name: 'companyId', description: 'Company id' })
  @ApiOkResponse({ description: 'Company unlinked from request.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async unlinkCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('companyId') companyId: string,
  ) {
    return {
      request: await this.requestsService.unlinkCompany(id, companyId, user),
    };
  }
}
