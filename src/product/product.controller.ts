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
  CreateFeatureSchema,
  type CreateFeatureInput,
} from './dto/create-feature.schema';
import {
  CreateInitiativeSchema,
  type CreateInitiativeInput,
} from './dto/create-initiative.schema';
import {
  QueryFeaturesSchema,
  type QueryFeaturesInput,
} from './dto/query-features.schema';
import {
  QueryInitiativesSchema,
  type QueryInitiativesInput,
} from './dto/query-initiatives.schema';
import {
  UpdateFeatureSchema,
  type UpdateFeatureInput,
} from './dto/update-feature.schema';
import {
  UpdateInitiativeSchema,
  type UpdateInitiativeInput,
} from './dto/update-initiative.schema';
import { ProductService } from './product.service';

@ApiTags('Product')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('initiatives')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create initiative' })
  @ApiBody({
    schema: {
      example: {
        title: 'Integrations Expansion',
        description: 'Group strategic integrations for Q2.',
        status: 'Planned',
        priority: 'High',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Initiative created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createInitiative(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateInitiativeSchema))
    body: CreateInitiativeInput,
  ) {
    return this.productService.createInitiative(body, user);
  }

  @Get('initiatives')
  @ApiOperation({ summary: 'List initiatives with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated initiatives.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listInitiatives(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryInitiativesSchema))
    query: QueryInitiativesInput,
  ) {
    return this.productService.listInitiatives(query, user.organizationId);
  }

  @Get('initiatives/:id')
  @ApiOperation({ summary: 'Get initiative by id' })
  @ApiOkResponse({ description: 'Returns the requested initiative.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getInitiative(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productService.getInitiative(id, user.organizationId);
  }

  @Get('initiatives/:id/features')
  @ApiOperation({ summary: 'Get features for a specific initiative' })
  @ApiOkResponse({
    description: 'Returns the features for the requested initiative.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getInitiativeFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productService.getInitiativeFeatures(id, user.organizationId);
  }

  @Patch('initiatives/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update initiative by id' })
  @ApiParam({ name: 'id', description: 'Initiative id' })
  @ApiBody({
    schema: {
      example: {
        status: 'In Progress',
        priority: 'Critical',
      },
    },
  })
  @ApiOkResponse({ description: 'Initiative updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateInitiative(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInitiativeSchema))
    body: UpdateInitiativeInput,
  ) {
    return this.productService.updateInitiative(id, body, user);
  }

  @Post('features')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create feature from requests' })
  @ApiBody({
    schema: {
      example: {
        title: 'Slack alerts v2',
        description:
          'Deliver configurable alert templates for enterprise teams.',
        requestIds: ['request-id-1', 'request-id-2'],
        initiativeId: 'initiative-id',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Feature created successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async createFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateFeatureSchema)) body: CreateFeatureInput,
  ) {
    return this.productService.createFeature(body, user);
  }

  @Get('features')
  @ApiOperation({ summary: 'List features with pagination and filters' })
  @ApiOkResponse({ description: 'Returns paginated features.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async listFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryFeaturesSchema))
    query: QueryFeaturesInput,
  ) {
    return this.productService.listFeatures(query, user.organizationId);
  }

  @Get('features/:id')
  @ApiOperation({ summary: 'Get feature by id' })
  @ApiParam({ name: 'id', description: 'Feature id' })
  @ApiOkResponse({ description: 'Returns feature by id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productService.findFeatureById(id, user.organizationId);
  }

  @Patch('features/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update feature by id' })
  @ApiParam({ name: 'id', description: 'Feature id' })
  @ApiBody({
    schema: {
      example: {
        status: 'In Progress',
      },
    },
  })
  @ApiOkResponse({ description: 'Feature updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFeatureSchema)) body: UpdateFeatureInput,
  ) {
    return this.productService.updateFeature(id, body, user);
  }

  @Post('features/:id/requests/:requestId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Link request to feature' })
  @ApiParam({ name: 'id', description: 'Feature id' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiCreatedResponse({ description: 'Request linked to feature.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async linkRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.productService.linkRequestToFeature(id, requestId, user);
  }

  @Delete('features/:id/requests/:requestId')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Unlink request from feature' })
  @ApiParam({ name: 'id', description: 'Feature id' })
  @ApiParam({ name: 'requestId', description: 'Request id' })
  @ApiOkResponse({ description: 'Request unlinked from feature.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async unlinkRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.productService.unlinkRequestFromFeature(id, requestId, user);
  }

  @Get('features/:id/traceability')
  @ApiOperation({
    summary: 'Get feature traceability (requests, customers, companies)',
  })
  @ApiParam({ name: 'id', description: 'Feature id' })
  @ApiOkResponse({ description: 'Returns feature traceability graph.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async getFeatureTraceability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productService.getFeatureTraceability(id, user.organizationId);
  }
}
