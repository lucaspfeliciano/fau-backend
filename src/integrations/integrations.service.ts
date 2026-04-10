import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { TaskStatus } from '../engineering/entities/task-status.enum';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import type { HubSpotSyncInput } from './dto/hubspot-sync.schema';
import type { LinearSyncInput } from './dto/linear-sync.schema';
import type { LinearWebhookTaskStatusInput } from './dto/linear-webhook-task-status.schema';
import type { SlackImportMessageInput } from './dto/slack-import-message.schema';
import type { SlackConfigInput } from './dto/slack-config.schema';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector, type SlackConfig } from './connectors/slack.connector';
import type { ExternalMappingEntity } from './entities/external-mapping.entity';
import { IntegrationProvider } from './entities/integration-provider.enum';

interface IntegrationMetrics {
  success: number;
  failure: number;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly slackConfigs = new Map<string, SlackConfig>();
  private readonly externalMappings: ExternalMappingEntity[] = [];
  private readonly metrics = new Map<string, IntegrationMetrics>();
  private readonly slackEventCursor = new Map<string, number>();

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly slackConnector: SlackConnector,
    private readonly hubspotConnector: HubSpotConnector,
    private readonly linearConnector: LinearConnector,
    private readonly companiesService: CompaniesService,
    private readonly customersService: CustomersService,
    private readonly engineeringService: EngineeringService,
    private readonly aiProcessingService: AiProcessingService,
  ) {}

  configureSlack(input: SlackConfigInput, actor: AuthenticatedUser) {
    this.slackConfigs.set(actor.organizationId, {
      webhookUrl: input.webhookUrl,
      defaultChannel: input.defaultChannel,
    });

    return {
      configured: true,
      organizationId: actor.organizationId,
      defaultChannel: input.defaultChannel,
    };
  }

  async syncSlackStatusEvents(actor: AuthenticatedUser) {
    const config = this.slackConfigs.get(actor.organizationId);
    if (!config) {
      throw new NotFoundException(
        'Slack integration is not configured for this organization.',
      );
    }

    const allEvents = this.domainEventsService.list();
    const startIndex = this.slackEventCursor.get(actor.organizationId) ?? 0;
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

      this.registerMapping({
        organizationId: actor.organizationId,
        provider: IntegrationProvider.Slack,
        entityType: 'event',
        internalId: `${event.name}:${event.occurredAt}`,
        externalId: correlationId,
      });

      delivered += 1;
    }

    this.slackEventCursor.set(actor.organizationId, allEvents.length);

    return {
      delivered,
      pendingEvents: 0,
    };
  }

  async syncHubSpot(input: HubSpotSyncInput, actor: AuthenticatedUser) {
    const correlationId = randomUUID();
    await this.executeWithRetry(
      IntegrationProvider.HubSpot,
      correlationId,
      () => this.hubspotConnector.sync(),
    );

    let companiesSynced = 0;
    let customersSynced = 0;

    const companyExternalMap = new Map<string, string>();

    for (const item of input.companies ?? []) {
      const existingMap = this.findMapping(
        actor.organizationId,
        IntegrationProvider.HubSpot,
        'company',
        item.externalCompanyId,
        'external',
      );

      if (existingMap) {
        this.companiesService.update(
          existingMap.internalId,
          {
            name: item.name,
            revenue: item.revenue,
          },
          actor,
        );
        companyExternalMap.set(item.externalCompanyId, existingMap.internalId);
      } else {
        const created = this.companiesService.create(
          {
            name: item.name,
            revenue: item.revenue,
          },
          actor,
        );

        this.registerMapping({
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
      const existingMap = this.findMapping(
        actor.organizationId,
        IntegrationProvider.HubSpot,
        'customer',
        item.externalCustomerId,
        'external',
      );

      const resolvedCompanyId = item.externalCompanyId
        ? (companyExternalMap.get(item.externalCompanyId) ??
          this.findMapping(
            actor.organizationId,
            IntegrationProvider.HubSpot,
            'company',
            item.externalCompanyId,
            'external',
          )?.internalId)
        : undefined;

      if (existingMap) {
        this.customersService.update(
          existingMap.internalId,
          {
            name: item.name,
            email: item.email,
            companyId: resolvedCompanyId,
          },
          actor,
        );
      } else {
        const created = this.customersService.create(
          {
            name: item.name,
            email: item.email,
            companyId: resolvedCompanyId,
          },
          actor,
        );

        this.registerMapping({
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
    const targetTaskIds =
      taskIds.length > 0
        ? taskIds
        : this.engineeringService
            .listTasks(
              {
                page: 1,
                limit: 1000,
              },
              actor.organizationId,
            )
            .items.map((task) => task.id);

    let synced = 0;

    for (const taskId of targetTaskIds) {
      const task = this.engineeringService.getTaskById(
        taskId,
        actor.organizationId,
      );
      const mapping = this.findMapping(
        actor.organizationId,
        IntegrationProvider.Linear,
        'task',
        task.id,
        'internal',
      );
      const correlationId = randomUUID();

      const result = await this.executeWithRetry(
        IntegrationProvider.Linear,
        correlationId,
        () => this.linearConnector.upsertIssue(task, mapping?.externalId),
      );

      this.registerMapping({
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

  handleLinearWebhookTaskStatus(
    input: LinearWebhookTaskStatusInput,
    actor: AuthenticatedUser,
  ) {
    const mapping = this.findMapping(
      actor.organizationId,
      IntegrationProvider.Linear,
      'task',
      input.externalIssueId,
      'external',
    );

    if (!mapping) {
      throw new NotFoundException('Linear task mapping not found.');
    }

    const task = this.engineeringService.updateTask(
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

  getStatus(organizationId: string) {
    const metrics = {
      slack: this.getMetrics(organizationId, IntegrationProvider.Slack),
      hubspot: this.getMetrics(organizationId, IntegrationProvider.HubSpot),
      linear: this.getMetrics(organizationId, IntegrationProvider.Linear),
    };

    const mappings = this.externalMappings.filter(
      (item) => item.organizationId === organizationId,
    );

    return {
      slackConfigured: this.slackConfigs.has(organizationId),
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
      },
      metrics,
    };
  }

  private async executeWithRetry<T>(
    provider: IntegrationProvider,
    correlationId: string,
    operation: () => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await operation();
        this.incrementMetric(provider, 'success');
        this.logger.log(
          `${provider} call succeeded correlationId=${correlationId} attempt=${attempt}`,
        );
        return result;
      } catch (error) {
        lastError = error;
        this.incrementMetric(provider, 'failure');
        this.logger.warn(
          `${provider} call failed correlationId=${correlationId} attempt=${attempt}`,
        );
      }
    }

    throw lastError;
  }

  private findMapping(
    organizationId: string,
    provider: IntegrationProvider,
    entityType: ExternalMappingEntity['entityType'],
    id: string,
    mode: 'internal' | 'external',
  ): ExternalMappingEntity | undefined {
    return this.externalMappings.find((mapping) => {
      if (
        mapping.organizationId !== organizationId ||
        mapping.provider !== provider ||
        mapping.entityType !== entityType
      ) {
        return false;
      }

      return mode === 'internal'
        ? mapping.internalId === id
        : mapping.externalId === id;
    });
  }

  private registerMapping(input: {
    organizationId: string;
    provider: IntegrationProvider;
    entityType: ExternalMappingEntity['entityType'];
    internalId: string;
    externalId: string;
  }): ExternalMappingEntity {
    const existing = this.findMapping(
      input.organizationId,
      input.provider,
      input.entityType,
      input.internalId,
      'internal',
    );

    const now = new Date().toISOString();

    if (existing) {
      existing.externalId = input.externalId;
      existing.syncedAt = now;
      return existing;
    }

    const mapping: ExternalMappingEntity = {
      id: randomUUID(),
      organizationId: input.organizationId,
      provider: input.provider,
      entityType: input.entityType,
      internalId: input.internalId,
      externalId: input.externalId,
      syncedAt: now,
    };

    this.externalMappings.push(mapping);
    return mapping;
  }

  private getMetricKey(
    organizationId: string,
    provider: IntegrationProvider,
  ): string {
    return `${organizationId}:${provider}`;
  }

  private incrementMetric(
    provider: IntegrationProvider,
    kind: keyof IntegrationMetrics,
    organizationId = 'global',
  ) {
    const key = this.getMetricKey(organizationId, provider);
    const current = this.metrics.get(key) ?? { success: 0, failure: 0 };
    current[kind] += 1;
    this.metrics.set(key, current);
  }

  private getMetrics(organizationId: string, provider: IntegrationProvider) {
    const orgMetrics = this.metrics.get(
      this.getMetricKey(organizationId, provider),
    ) ?? {
      success: 0,
      failure: 0,
    };
    const globalMetrics = this.metrics.get(
      this.getMetricKey('global', provider),
    ) ?? {
      success: 0,
      failure: 0,
    };

    return {
      success: orgMetrics.success + globalMetrics.success,
      failure: orgMetrics.failure + globalMetrics.failure,
    };
  }
}
