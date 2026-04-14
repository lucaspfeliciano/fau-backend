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
import { CreateInitiativeDto } from './dto/create-initiative.dto';
import { QueryInitiativesDto } from './dto/query-initiatives.dto';
import { UpdateInitiativeDto } from './dto/update-initiative.dto';
import { InitiativesService } from './initiatives.service';

@ApiTags('Initiatives')
@ApiBearerAuth()
@Controller('initiatives')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InitiativesController {
  constructor(private readonly initiativesService: InitiativesService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create initiative' })
  @ApiBody({
    schema: {
      example: {
        title: 'Melhorias de Analytics',
        description: 'Consolidar demandas de exportacao por squad.',
        requestIds: ['request-1', 'request-2'],
        status: 'planned',
        priorityNotes: 'Iniciar com contas enterprise.',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Initiative created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: CreateInitiativeDto,
  ) {
    return {
      initiative: await this.initiativesService.create(body, user),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List initiatives with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated initiatives.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: QueryInitiativesDto,
  ) {
    return this.initiativesService.list(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get initiative by id' })
  @ApiParam({ name: 'id', description: 'Initiative id' })
  @ApiOkResponse({ description: 'Returns initiative by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      initiative: await this.initiativesService.findOneById(
        id,
        user.organizationId,
      ),
    };
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update initiative by id' })
  @ApiParam({ name: 'id', description: 'Initiative id' })
  @ApiBody({
    schema: {
      example: {
        status: 'in_progress',
        requestIds: ['request-1', 'request-3'],
      },
    },
  })
  @ApiOkResponse({ description: 'Initiative updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: UpdateInitiativeDto,
  ) {
    return {
      initiative: await this.initiativesService.update(id, body, user),
    };
  }
}
