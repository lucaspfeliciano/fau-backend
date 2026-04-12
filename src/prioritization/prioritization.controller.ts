import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
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
import { QueryRankingSchema } from './dto/query-ranking.schema';
import type { QueryRankingInput } from './dto/query-ranking.schema';
import { UpdateWeightsSchema } from './dto/update-weights.schema';
import type { UpdateWeightsInput } from './dto/update-weights.schema';
import { PrioritizationService } from './prioritization.service';

@ApiTags('Prioritization')
@ApiBearerAuth()
@Controller('prioritization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrioritizationController {
  constructor(private readonly prioritizationService: PrioritizationService) {}

  @Get('weights')
  @Roles(Role.Admin, Role.Editor, Role.Viewer)
  @ApiOperation({ summary: 'Get prioritization weights for the organization' })
  @ApiOkResponse({ description: 'Returns weights and tag lists.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getWeights(@CurrentUser() user: AuthenticatedUser) {
    return this.prioritizationService.getWeights(user.organizationId);
  }

  @Put('weights')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update prioritization weights (Admin only)' })
  @ApiOkResponse({ description: 'Weights saved.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateWeights(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateWeightsSchema)) body: UpdateWeightsInput,
  ) {
    const saved = await this.prioritizationService.updateWeights(
      user.organizationId,
      body,
    );
    await this.prioritizationService.syncAutomaticFeatureScores(
      user.organizationId,
    );
    return saved;
  }

  @Get('ranking/requests')
  @Roles(Role.Admin, Role.Editor, Role.Viewer)
  @ApiOperation({ summary: 'List requests ranked by composite priority score' })
  @ApiOkResponse({
    description: 'Paginated ranked requests with score breakdown.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  rankRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRankingSchema)) query: QueryRankingInput,
  ) {
    return this.prioritizationService.rankRequests(user.organizationId, query);
  }

  @Get('ranking/features')
  @Roles(Role.Admin, Role.Editor, Role.Viewer)
  @ApiOperation({ summary: 'List features ranked by composite priority score' })
  @ApiOkResponse({
    description: 'Paginated ranked features with score breakdown.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  rankFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryRankingSchema)) query: QueryRankingInput,
  ) {
    return this.prioritizationService.rankFeatures(user.organizationId, query);
  }

  @Get('score/:entityType/:id')
  @Roles(Role.Admin, Role.Editor, Role.Viewer)
  @ApiOperation({
    summary: 'Explain priority score for one request or feature',
  })
  @ApiOkResponse({ description: 'Score breakdown and weights snapshot.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getScore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
  ) {
    if (entityType !== 'requests' && entityType !== 'features') {
      throw new BadRequestException(
        'entityType must be "requests" or "features".',
      );
    }
    return this.prioritizationService.getScore(
      user.organizationId,
      entityType,
      id,
    );
  }
}
