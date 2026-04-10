import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import {
  HubSpotSyncSchema,
  type HubSpotSyncInput,
} from './dto/hubspot-sync.schema';
import {
  LinearSyncSchema,
  type LinearSyncInput,
} from './dto/linear-sync.schema';
import {
  LinearWebhookTaskStatusSchema,
  type LinearWebhookTaskStatusInput,
} from './dto/linear-webhook-task-status.schema';
import {
  SlackImportMessageSchema,
  type SlackImportMessageInput,
} from './dto/slack-import-message.schema';
import {
  SlackConfigSchema,
  type SlackConfigInput,
} from './dto/slack-config.schema';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('slack/config')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Configure Slack webhook per organization' })
  @ApiBody({
    schema: {
      example: {
        webhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXXX',
        defaultChannel: '#product-updates',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Slack configured.' })
  configureSlack(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SlackConfigSchema)) body: SlackConfigInput,
  ) {
    return this.integrationsService.configureSlack(body, user);
  }

  @Post('slack/sync-events')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Send status change events to Slack' })
  @ApiCreatedResponse({ description: 'Slack sync executed.' })
  syncSlackEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.syncSlackStatusEvents(user);
  }

  @Post('hubspot/sync')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({
    summary: 'Sync customers and companies from HubSpot payload',
  })
  @ApiBody({
    schema: {
      example: {
        companies: [
          {
            externalCompanyId: 'hs-company-1',
            name: 'Acme Corp',
            revenue: 500000,
          },
        ],
        customers: [
          {
            externalCustomerId: 'hs-contact-1',
            name: 'Alice Johnson',
            email: 'alice@acme.com',
            externalCompanyId: 'hs-company-1',
          },
        ],
      },
    },
  })
  @ApiCreatedResponse({ description: 'HubSpot sync executed.' })
  syncHubSpot(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(HubSpotSyncSchema)) body: HubSpotSyncInput,
  ) {
    return this.integrationsService.syncHubSpot(body, user);
  }

  @Post('linear/sync')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Create or update Linear issues from tasks' })
  @ApiBody({
    schema: {
      example: {
        taskIds: ['task-id-1', 'task-id-2'],
      },
    },
  })
  @ApiCreatedResponse({ description: 'Linear sync executed.' })
  syncLinear(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(LinearSyncSchema)) body: LinearSyncInput,
  ) {
    return this.integrationsService.syncLinear(body, user);
  }

  @Post('linear/webhook/task-status')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({
    summary: 'Consume Linear webhook status updates and reflect internally',
  })
  @ApiBody({
    schema: {
      example: {
        externalIssueId: 'linear-task-123',
        status: 'Done',
      },
    },
  })
  @ApiCreatedResponse({ description: 'Webhook status applied.' })
  applyLinearWebhookStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(LinearWebhookTaskStatusSchema))
    body: LinearWebhookTaskStatusInput,
  ) {
    return this.integrationsService.handleLinearWebhookTaskStatus(body, user);
  }

  @Post('slack/import-message')
  @Roles(Role.Admin, Role.Editor)
  @ApiOperation({ summary: 'Import Slack message into AI processing pipeline' })
  @ApiBody({
    schema: {
      example: {
        noteExternalId: 'slack-msg-001',
        text: 'Cliente pediu melhoria no dashboard e relatou bug no export CSV.',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Slack message processed by AI pipeline.',
  })
  importSlackMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SlackImportMessageSchema))
    body: SlackImportMessageInput,
  ) {
    return this.integrationsService.importSlackMessage(body, user);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get integrations health/status for current organization',
  })
  @ApiOkResponse({ description: 'Returns integration status and metrics.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Role does not allow this operation.' })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.getStatus(user.organizationId);
  }
}
