import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import type { FirefliesConfigInput } from './dto/fireflies-config.schema';
import type { FirefliesImportTranscriptInput } from './dto/fireflies-import-transcript.schema';
import type { HubSpotSyncInput } from './dto/hubspot-sync.schema';
import type { LinearSyncInput } from './dto/linear-sync.schema';
import type { LinearWebhookTaskStatusInput } from './dto/linear-webhook-task-status.schema';
import type { SlackImportMessageInput } from './dto/slack-import-message.schema';
import type { SlackConfigInput } from './dto/slack-config.schema';
import {
  FirefliesConnector,
  type FirefliesConfig,
} from './connectors/fireflies.connector';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector, type SlackConfig } from './connectors/slack.connector';
import type { ExternalMappingEntity } from './entities/external-mapping.entity';
import { IntegrationProvider } from './entities/integration-provider.enum';
import { ExternalMappingsRepository } from './repositories/external-mappings.repository';
import { IntegrationConfigsRepository } from './repositories/integration-configs.repository';
import { IntegrationCursorsRepository } from './repositories/integration-cursors.repository';
import { IntegrationMetricsRepository } from './repositories/integration-metrics.repository';

export interface IntegrationMetrics {
  success: number;
  failure: number;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly firefliesConnector: FirefliesConnector,
    private readonly slackConnector: SlackConnector,
    private readonly hubspotConnector: HubSpotConnector,
    private readonly linearConnector: LinearConnector,
    private readonly companiesService: CompaniesService,
    private readonly customersService: CustomersService,
    private readonly engineeringService: EngineeringService,
    private readonly aiProcessingService: AiProcessingService,
    private readonly integrationConfigsRepository: IntegrationConfigsRepository,
    private readonly externalMappingsRepository: ExternalMappingsRepository,
    private readonly integrationMetricsRepository: IntegrationMetricsRepository,
    private readonly integrationCursorsRepository: IntegrationCursorsRepository,
  ) {}

  async configureFireflies(
    input: FirefliesConfigInput,
    actor: AuthenticatedUser,
  ) {
    await this.integrationConfigsRepository.upsertFirefliesConfig(
      actor.organizationId,
      {
        apiKey: input.apiKey,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        defaultLanguage: input.defaultLanguage,
      },
    );

    return {
      configured: true,
      organizationId: actor.organizationId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      defaultLanguage: input.defaultLanguage,
      apiKeyMasked: this.maskSecret(input.apiKey),
    };
  }

  async getFirefliesConfig(organizationId: string) {
    const config =
      await this.integrationConfigsRepository.findFirefliesConfig(
        organizationId,
      );

    if (!config) {
      return {
        configured: false,
      };
    }

    return {
      configured: true,
      workspaceId: config.workspaceId,
      projectId: config.projectId,
      defaultLanguage: config.defaultLanguage,
      updatedAt: config.updatedAt,
      apiKeyMasked: this.maskSecret(config.apiKey),
    };
  }

  async importFirefliesTranscript(
    input: FirefliesImportTranscriptInput,
    actor: AuthenticatedUser,
  ) {
    const configRecord =
      await this.integrationConfigsRepository.findFirefliesConfig(
        actor.organizationId,
      );

    if (!configRecord) {
      throw new NotFoundException(
        'Fireflies integration is not configured for this organization.',
      );
    }

    const config: FirefliesConfig = {
      apiKey: configRecord.apiKey,
      workspaceId: configRecord.workspaceId,
      projectId: configRecord.projectId,
      defaultLanguage: configRecord.defaultLanguage,
    };

    const correlationId = randomUUID();

    const connectorResult = await this.executeWithRetry(
      actor.organizationId,
      IntegrationProvider.Fireflies,
      correlationId,
      () => this.firefliesConnector.importTranscript(config, input),
    );

    await this.registerMapping({
      organizationId: actor.organizationId,
      provider: IntegrationProvider.Fireflies,
      entityType: 'transcript',
      internalId: input.externalTranscriptId,
      externalId: connectorResult.externalImportId,
    });

    const aiResult = await this.aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.FirefliesTranscript,
        noteExternalId: input.externalTranscriptId,
        text: input.transcriptText,
      },
      actor,
    );

    this.domainEventsService.publish({
      name: 'integrations.fireflies_transcript_imported',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        externalTranscriptId: input.externalTranscriptId,
        importId: connectorResult.externalImportId,
        extractedItemsCount: aiResult.totalExtractedItems,
        queuedForReviewCount: aiResult.queuedForReviewItems,
      },
    });

    return {
      importId: connectorResult.externalImportId,
      extractedItemsCount: aiResult.totalExtractedItems,
      queuedForReviewCount: aiResult.queuedForReviewItems,
    };
  }

  async configureSlack(input: SlackConfigInput, actor: AuthenticatedUser) {
    await this.integrationConfigsRepository.upsertSlackConfig(
      actor.organizationId,
      {
        webhookUrl: input.webhookUrl,
        defaultChannel: input.defaultChannel,
      },
    );

    return {
      configured: true,
      organizationId: actor.organizationId,
      defaultChannel: input.defaultChannel,
    };
  }

  async syncSlackStatusEvents(actor: AuthenticatedUser) {
    const configRecord =
      await this.integrationConfigsRepository.findSlackConfig(
        actor.organizationId,
      );

    if (!configRecord) {
      throw new NotFoundException(
        'Slack integration is not configured for this organization.',
      );
    }

    const config: SlackConfig = {
      webhookUrl: configRecord.webhookUrl,
      defaultChannel: configRecord.defaultChannel,
    };

    const allEvents = this.domainEventsService.list();
    const startIndex = await this.integrationCursorsRepository.get(
      actor.organizationId,
      IntegrationProvider.Slack,
    );

    const scopedEvents = allEvents.slice(startIndex).filter((event) => {
      if (event.organizationId !== actor.organizationId) {
        return false;
      }

      return [
        'request.status_changed',
        'product.feature_status_changed',
        'engineering.sprint_status_changed',
      ].includes(event.name);
    });

    let delivered = 0;

    for (const event of scopedEvents) {
      const correlationId = randomUUID();
      const text = `[${event.name}] ${JSON.stringify(event.payload)}`;

      await this.executeWithRetry(
        actor.organizationId,
        IntegrationProvider.Slack,
        correlationId,
        () =>
          this.slackConnector.sendMessage(
            config,
            {
              text,
              channel: config.defaultChannel,
              metadata: {
                occurredAt: event.occurredAt,
              },
            },
            correlationId,
          ),
      );

      await this.registerMapping({
        organizationId: actor.organizationId,
        provider: IntegrationProvider.Slack,
        entityType: 'event',
        internalId: `${event.name}:${event.occurredAt}`,
        externalId: correlationId,
      });

      delivered += 1;
    }

    await this.integrationCursorsRepository.set(
      actor.organizationId,
      IntegrationProvider.Slack,
      allEvents.length,
    );

    return {
      delivered,
      pendingEvents: 0,
    };
  }

  async syncHubSpot(input: HubSpotSyncInput, actor: AuthenticatedUser) {
    const correlationId = randomUUID();

    await this.executeWithRetry(
      actor.organizationId,
      IntegrationProvider.HubSpot,
      correlationId,
      () => this.hubspotConnector.sync(),
    );

    let companiesSynced = 0;
    let customersSynced = 0;

    const companyExternalMap = new Map<string, string>();

    for (const item of input.companies ?? []) {
      const existingMap = await this.findMapping(
        actor.organizationId,
        IntegrationProvider.HubSpot,
        'company',
        item.externalCompanyId,
        'external',
      );

      if (existingMap) {
        await this.companiesService.update(
          existingMap.internalId,
          {
            name: item.name,
            revenue: item.revenue,
          },
          actor,
        );
        companyExternalMap.set(item.externalCompanyId, existingMap.internalId);
      } else {
        const created = await this.companiesService.create(
          {
            name: item.name,
            revenue: item.revenue,
          },
          actor,
        );

        await this.registerMapping({
          organizationId: actor.organizationId,
          provider: IntegrationProvider.HubSpot,
          entityType: 'company',
          internalId: created.id,
          externalId: item.externalCompanyId,
        });

        companyExternalMap.set(item.externalCompanyId, created.id);
      }

      companiesSynced += 1;
    }

    for (const item of input.customers ?? []) {
      const existingMap = await this.findMapping(
        actor.organizationId,
        IntegrationProvider.HubSpot,
        'customer',
        item.externalCustomerId,
        'external',
      );

      const mappedCompany = item.externalCompanyId
        ? (companyExternalMap.get(item.externalCompanyId) ??
          (
            await this.findMapping(
              actor.organizationId,
              IntegrationProvider.HubSpot,
              'company',
              item.externalCompanyId,
              'external',
            )
          )?.internalId)
        : undefined;

      if (existingMap) {
        await this.customersService.update(
          existingMap.internalId,
          {
            name: item.name,
            email: item.email,
            companyId: mappedCompany,
          },
          actor,
        );
      } else {
        const created = await this.customersService.create(
          {
            name: item.name,
            email: item.email,
            companyId: mappedCompany,
          },
          actor,
        );

        await this.registerMapping({
          organizationId: actor.organizationId,
          provider: IntegrationProvider.HubSpot,
          entityType: 'customer',
          internalId: created.id,
          externalId: item.externalCustomerId,
        });
      }

      customersSynced += 1;
    }

    return {
      companiesSynced,
      customersSynced,
    };
  }

  async syncLinear(input: LinearSyncInput, actor: AuthenticatedUser) {
    const taskIds = input.taskIds ?? [];
    const tasksResult = await this.engineeringService.listTasks(
      {
        page: 1,
        limit: 1000,
      },
      actor.organizationId,
    );

    const targetTaskIds =
      taskIds.length > 0 ? taskIds : tasksResult.items.map((task) => task.id);

    let synced = 0;

    for (const taskId of targetTaskIds) {
      const task = await this.engineeringService.getTaskById(
        taskId,
        actor.organizationId,
      );

      const mapping = await this.findMapping(
        actor.organizationId,
        IntegrationProvider.Linear,
        'task',
        task.id,
        'internal',
      );

      const correlationId = randomUUID();
      const result = await this.executeWithRetry(
        actor.organizationId,
        IntegrationProvider.Linear,
        correlationId,
        () => this.linearConnector.upsertIssue(task, mapping?.externalId),
      );

      await this.registerMapping({
        organizationId: actor.organizationId,
        provider: IntegrationProvider.Linear,
        entityType: 'task',
        internalId: task.id,
        externalId: result.externalIssueId,
      });

      synced += 1;
    }

    return {
      synced,
    };
  }

  async handleLinearWebhookTaskStatus(
    input: LinearWebhookTaskStatusInput,
    actor: AuthenticatedUser,
  ) {
    const mapping = await this.findMapping(
      actor.organizationId,
      IntegrationProvider.Linear,
      'task',
      input.externalIssueId,
      'external',
    );

    if (!mapping) {
      throw new NotFoundException('Linear task mapping not found.');
    }

    const task = await this.engineeringService.updateTask(
      mapping.internalId,
      {
        status: input.status,
      },
      actor,
    );

    return {
      task,
      source: IntegrationProvider.Linear,
    };
  }

  async importSlackMessage(
    input: SlackImportMessageInput,
    actor: AuthenticatedUser,
  ) {
    return this.aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.SlackMessage,
        noteExternalId: input.noteExternalId,
        text: input.text,
      },
      actor,
    );
  }

  async getStatus(organizationId: string) {
    const metrics = {
      slack: await this.getMetrics(organizationId, IntegrationProvider.Slack),
      hubspot: await this.getMetrics(
        organizationId,
        IntegrationProvider.HubSpot,
      ),
      linear: await this.getMetrics(organizationId, IntegrationProvider.Linear),
      fireflies: await this.getMetrics(
        organizationId,
        IntegrationProvider.Fireflies,
      ),
    };

    const mappings =
      await this.externalMappingsRepository.listByOrganization(organizationId);

    const hasSlackConfig = Boolean(
      await this.integrationConfigsRepository.findSlackConfig(organizationId),
    );

    const hasFirefliesConfig = Boolean(
      await this.integrationConfigsRepository.findFirefliesConfig(
        organizationId,
      ),
    );

    return {
      slackConfigured: hasSlackConfig,
      firefliesConfigured: hasFirefliesConfig,
      mappingsCount: mappings.length,
      mappingsByProvider: {
        slack: mappings.filter(
          (item) => item.provider === IntegrationProvider.Slack,
        ).length,
        hubspot: mappings.filter(
          (item) => item.provider === IntegrationProvider.HubSpot,
        ).length,
        linear: mappings.filter(
          (item) => item.provider === IntegrationProvider.Linear,
        ).length,
        fireflies: mappings.filter(
          (item) => item.provider === IntegrationProvider.Fireflies,
        ).length,
      },
      metrics,
    };
  }

  private maskSecret(value: string): string {
    if (value.length <= 6) {
      return '******';
    }

    return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  }

  private async executeWithRetry<T>(
    organizationId: string,
    provider: IntegrationProvider,
    correlationId: string,
    operation: () => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await operation();
        await this.integrationMetricsRepository.increment(
          organizationId,
          provider,
          'success',
        );

        this.logger.log(
          `${provider} call succeeded correlationId=${correlationId} attempt=${attempt}`,
        );

        return result;
      } catch (error) {
        lastError = error;
        await this.integrationMetricsRepository.increment(
          organizationId,
          provider,
          'failure',
        );

        this.logger.warn(
          `${provider} call failed correlationId=${correlationId} attempt=${attempt}`,
        );
      }
    }

    throw lastError;
  }

  private async findMapping(
    organizationId: string,
    provider: IntegrationProvider,
    entityType: ExternalMappingEntity['entityType'],
    id: string,
    mode: 'internal' | 'external',
  ): Promise<ExternalMappingEntity | undefined> {
    if (mode === 'internal') {
      return this.externalMappingsRepository.findByInternal(
        organizationId,
        provider,
        entityType,
        id,
      );
    }

    return this.externalMappingsRepository.findByExternal(
      organizationId,
      provider,
      entityType,
      id,
    );
  }

  private async registerMapping(input: {
    organizationId: string;
    provider: IntegrationProvider;
    entityType: ExternalMappingEntity['entityType'];
    internalId: string;
    externalId: string;
  }): Promise<ExternalMappingEntity> {
    const existing = await this.externalMappingsRepository.findByInternal(
      input.organizationId,
      input.provider,
      input.entityType,
      input.internalId,
    );

    const mapping: ExternalMappingEntity = {
      id: existing?.id ?? randomUUID(),
      organizationId: input.organizationId,
      provider: input.provider,
      entityType: input.entityType,
      internalId: input.internalId,
      externalId: input.externalId,
      syncedAt: new Date().toISOString(),
    };

    await this.externalMappingsRepository.upsert(mapping);
    return mapping;
  }

  private async getMetrics(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationMetrics> {
    return this.integrationMetricsRepository.get(organizationId, provider);
  }
}
