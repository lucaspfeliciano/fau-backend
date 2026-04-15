import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { AuditService } from './audit.service';
import {
  CreateAuditEventSchema,
  type CreateAuditEventInput,
} from './dto/create-audit-event.schema';
import { QueryAuditEventsSchema } from './dto/query-audit-events.schema';
import type { QueryAuditEventsInput } from './dto/query-audit-events.schema';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('events')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create manual audit event' })
  @ApiBody({
    schema: {
      example: {
        action: 'request.moderated',
        description: 'Request moved to moderated state by compliance review.',
        severity: 'medium',
        metadata: {
          requestId: 'req-1',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Audit event created.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateAuditEventSchema))
    body: CreateAuditEventInput,
  ) {
    return this.auditService.createManualEvent(body, user);
  }

  @Get('events')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List audit events for current organization' })
  @ApiOkResponse({ description: 'Returns paginated audit events.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(QueryAuditEventsSchema))
    query: QueryAuditEventsInput,
  ) {
    return this.auditService.list(user.organizationId, {
      page: query.page,
      limit: query.limit,
      actorId: query.actorId,
      action: query.action,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
