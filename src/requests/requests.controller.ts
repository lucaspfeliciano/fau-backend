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
import { CreateRequestDto } from './dto/create-request.dto';
import { PromoteFeedbackToRequestDto } from './dto/promote-feedback-to-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestsService } from './requests.service';

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
        title: 'Exportar dashboard por squad',
        description:
          'Consolidacao do pedido de clientes enterprise para filtrar por squad.',
        feedbackIds: ['feedback-1'],
        customerIds: ['customer-1', 'customer-2'],
        problems: ['Times nao conseguem exportar por squad no formato atual.'],
        solutions: ['Adicionar filtro por squad no modal de exportacao.'],
        product: 'Analytics',
        functionality: 'Dashboard Export',
        status: 'new',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Request created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateRequestDto,
  ) {
    const request = await this.requestsService.createCanonical(body, user);

    const similarResult = await this.requestsService
      .findSimilarRequests(user.organizationId, {
        title: request.title,
        details: request.description,
      })
      .catch(() => ({ items: [] as typeof similar }));

    const similar = similarResult.items
      .filter((s) => s.requestId !== request.id)
      .slice(0, 5);

    return { request, similar };
  }

  @Post('promote-feedback/:feedbackId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Promote feedback into a canonical request' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback id' })
  @ApiBody({
    schema: {
      example: {
        title: 'Exportar dashboard por squad',
        description:
          'Consolidacao da demanda vinda do feedback para fluxo estruturado.',
        problems: ['Times nao conseguem exportar por squad no formato atual.'],
        solutions: ['Adicionar filtro por squad no modal de exportacao.'],
        product: 'Analytics',
        functionality: 'Dashboard Export',
        status: 'new',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Feedback promoted to request.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async promoteFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('feedbackId') feedbackId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: PromoteFeedbackToRequestDto,
  ) {
    return this.requestsService.promoteFeedbackToRequest(
      feedbackId,
      body,
      user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List requests with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated requests.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryRequestsDto,
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
    return this.requestsService.findOneWithMeta(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update request by id' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiBody({
    schema: {
      example: {
        status: 'analyzing',
        feedbackIds: ['feedback-1', 'feedback-2'],
        problems: ['O fluxo atual gera retrabalho no time de CS.'],
        solutions: ['Padronizar exportacao por squad e periodo.'],
      },
    },
  })
  @ApiOkResponse({ description: 'Request updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, body, user);
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
    return this.requestsService.linkCustomer(id, customerId, user);
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
    return this.requestsService.unlinkCustomer(id, customerId, user);
  }
}
