import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { AnalyticsService } from './analytics.service';
import { QueryAdoptionSchema } from './dto/query-adoption.schema';
import type { QueryAdoptionInput } from './dto/query-adoption.schema';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('adoption')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Get adoption metrics by period' })
  @ApiOkResponse({ description: 'Returns adoption metrics.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getAdoption(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryAdoptionSchema))
    query: QueryAdoptionInput,
  ) {
    return this.analyticsService.getAdoptionMetrics(user.organizationId, {
      startDate: query.startDate,
      endDate: query.endDate,
      teamId: query.teamId,
    });
  }
}
