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
  CreateCustomerSchema,
  type CreateCustomerInput,
} from './dto/create-customer.schema';
import {
  QueryCustomersSchema,
  type QueryCustomersInput,
} from './dto/query-customers.schema';
import {
  UpdateCustomerSchema,
  type UpdateCustomerInput,
} from './dto/update-customer.schema';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create customer' })
  @ApiBody({
    schema: {
      example: {
        name: 'Alice Johnson',
        email: 'alice@acme.com',
        companyId: 'company-id',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Customer created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateCustomerSchema))
    body: CreateCustomerInput,
  ) {
    return {
      customer: await this.customersService.create(body, user),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ description: 'Returns paginated customers.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryCustomersSchema))
    query: QueryCustomersInput,
  ) {
    return this.customersService.list(query, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  @ApiParam({ name: 'id', description: 'Customer id' })
  @ApiOkResponse({ description: 'Returns customer details.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      customer: await this.customersService.findOneById(
        id,
        user.organizationId,
      ),
    };
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', description: 'Customer id' })
  @ApiBody({
    schema: {
      example: {
        name: 'Alice Johnson Silva',
        email: 'alice.silva@acme.com',
      },
    },
  })
  @ApiOkResponse({ description: 'Customer updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCustomerSchema))
    body: UpdateCustomerInput,
  ) {
    return {
      customer: await this.customersService.update(id, body, user),
    };
  }
}
