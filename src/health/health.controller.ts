import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Role } from '../common/auth/role.enum';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { HealthService } from './health.service';
import { QueryHealthEventsSchema } from './dto/query-health-events.schema';
import type { QueryHealthEventsInput } from './dto/query-health-events.schema';

@ApiTags('Health')
@ApiBearerAuth()
@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('events')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'List operational health events for reliability dashboard',
  })
  @ApiOkResponse({
    description: 'Returns paginated health events with summary.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  listEvents(
    @Query(new ZodValidationPipe(QueryHealthEventsSchema))
    query: QueryHealthEventsInput,
  ) {
    return this.healthService.listEvents({
      page: query.page,
      limit: query.limit,
      severity: query.severity,
      component: query.component,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get('events/pipeline')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Get domain event pipeline observability metrics and catalog',
  })
  @ApiOkResponse({
    description:
      'Returns event runtime counters, outbox stats and event catalog.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getEventPipelineStatus() {
    return this.healthService.getEventPipelineStatus();
  }
}
