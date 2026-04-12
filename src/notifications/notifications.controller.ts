import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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
  CreateReleaseSchema,
  type CreateReleaseInput,
} from './dto/create-release.schema';
import {
  NotificationPreferencesSchema,
  type NotificationPreferencesInput,
} from './dto/notification-preferences.schema';
import {
  UpdateReleaseSchema,
  type UpdateReleaseInput,
} from './dto/update-release.schema';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('notifications/preferences')
  @ApiOperation({
    summary: 'Set notification preferences by organization/team',
  })
  @ApiBody({
    schema: {
      example: {
        notifyRequestStatus: true,
        notifyFeatureStatus: true,
        notifySprintStatus: true,
        notifyRelease: true,
      },
    },
  })
  @ApiCreatedResponse({ description: 'Notification preferences updated.' })
  @Roles(Role.Admin, Role.Editor)
  upsertPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(NotificationPreferencesSchema))
    body: NotificationPreferencesInput,
  ) {
    return this.notificationsService.upsertPreferences(body, user);
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'List notification preferences' })
  @ApiOkResponse({ description: 'Returns preferences list.' })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.organizationId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List generated notifications' })
  @ApiOkResponse({ description: 'Returns generated notifications.' })
  listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listNotifications(user.organizationId);
  }

  @Post('releases')
  @ApiOperation({ summary: 'Create release linked to features and sprints' })
  @ApiBody({
    schema: {
      example: {
        version: 'v1.0.0',
        title: 'Go-live release',
        notes: 'Initial launch release for v1.',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Release created.' })
  @Roles(Role.Admin, Role.Editor)
  createRelease(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateReleaseSchema)) body: CreateReleaseInput,
  ) {
    return this.notificationsService.createRelease(body, user);
  }

  @Get('releases')
  @ApiOperation({ summary: 'List releases' })
  @ApiOkResponse({ description: 'Returns releases list.' })
  listReleases(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listReleases(user.organizationId);
  }

  @Patch('releases/:id')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Update release by id' })
  @ApiParam({ name: 'id', description: 'Release id' })
  @ApiBody({
    schema: {
      example: {
        title: 'Updated release title',
        status: 'scheduled',
        scheduledAt: '2026-05-01T00:00:00.000Z',
      },
    },
  })
  @ApiOkResponse({ description: 'Release updated successfully.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async updateRelease(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateReleaseSchema)) body: UpdateReleaseInput,
  ) {
    try {
      return await this.notificationsService.updateRelease(id, body, user);
    } catch (error) {
      if (error instanceof Error && error.message === 'RELEASE_NOT_FOUND') {
        throw new NotFoundException('Release not found.');
      }
      throw error;
    }
  }

  @Get('roadmap/overview')
  @ApiOperation({ summary: 'Get roadmap overview and delivery forecast' })
  @ApiOkResponse({ description: 'Returns roadmap overview.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  getRoadmapOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getRoadmapOverview(user.organizationId);
  }

  @Get('roadmap/traceability/requests/:id')
  @ApiOperation({ summary: 'Get end-to-end traceability for a request' })
  @ApiParam({ name: 'id', description: 'Request id' })
  @ApiOkResponse({ description: 'Returns full traceability chain.' })
  getRequestTraceability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.getRequestTraceability(
      id,
      user.organizationId,
    );
  }
}
