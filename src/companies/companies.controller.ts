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
import { CompaniesService } from './companies.service';
import {
  CreateCompanySchema,
  type CreateCompanyInput,
} from './dto/create-company.schema';
import {
  QueryCompaniesSchema,
  type QueryCompaniesInput,
} from './dto/query-companies.schema';
import {
  UpdateCompanySchema,
  type UpdateCompanyInput,
} from './dto/update-company.schema';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create company' })
  @ApiBody({
    schema: {
      example: {
        name: 'Acme Corp',
        revenue: 150000,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Company created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateCompanySchema)) body: CreateCompanyInput,
  ) {
    return this.companiesService.create(body, user);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiOkResponse({ description: 'Returns paginated companies.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryCompaniesSchema))
    query: QueryCompaniesInput,
  ) {
    return this.companiesService.list(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by id' })
  @ApiParam({ name: 'id', description: 'Company id' })
  @ApiOkResponse({ description: 'Returns company details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.companiesService.findOneById(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company id' })
  @ApiBody({
    schema: {
      example: {
        name: 'Acme Enterprise',
        revenue: 450000,
      },
    },
  })
  @ApiOkResponse({ description: 'Company updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCompanySchema)) body: UpdateCompanyInput,
  ) {
    return this.companiesService.update(id, body, user);
  }
}
