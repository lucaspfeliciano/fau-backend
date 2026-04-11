import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
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
import type { LinearWebhookSecurityConfigInput } from './dto/linear-webhook-security-config.schema';
import type { LinearSyncInput } from './dto/linear-sync.schema';
import type { LinearWebhookTaskStatusInput } from './dto/linear-webhook-task-status.schema';
import type { ReconcileIntegrationsInput } from './dto/reconcile-integrations.schema';
import type { ReprocessIntegrationsInput } from './dto/reprocess-integrations.schema';
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

type OwnershipEntityType =
  | 'company'
  | 'customer'
  | 'task'
  | 'request'
  | 'transcript'
  | 'event';

interface OwnershipFieldRule {
  owner: 'internal' | 'external';
  conflictPolicy: 'keep_internal' | 'use_external' | 'merge';
  rationale: string;
}

type OwnershipContracts = Record<
  OwnershipEntityType,
  Record<string, OwnershipFieldRule>
>;

export interface ReconciliationDivergence {
  mappingId: string;
  provider: IntegrationProvider;
  entityType: ExternalMappingEntity['entityType'];
  internalId: string;
  externalId: string;
  reason:
    | 'missing_internal_reference'
    | 'duplicate_external_mapping'
    | 'duplicate_internal_mapping';
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface ReconciliationResult {
  reconciledAt: string;
  organizationId: string;
  provider?: IntegrationProvider;
  dryRun: boolean;
  scanned: number;
  resolved: number;
  pending: number;
  divergences: ReconciliationDivergence[];
}

interface ProviderDashboardItem {
  success: number;
  failure: number;
  total: number;
  failureRate: number;
  availability: number;
  status: 'healthy' | 'degraded' | 'down';
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly ownershipContracts: OwnershipContracts = {
    company: {
      name: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Company naming follows curated internal taxonomy.',
      },
      revenue: {
        owner: 'external',
        conflictPolicy: 'use_external',
        rationale: 'Revenue is considered enrichment from CRM source.',
      },
    },
    customer: {
      name: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Customer naming must preserve internal conventions.',
      },
      email: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Internal identity ownership prevents external override.',
      },
      companyId: {
        owner: 'external',
        conflictPolicy: 'use_external',
        rationale: 'Company linkage can be synchronized from CRM hierarchy.',
      },
    },
    task: {
      status: {
        owner: 'external',
        conflictPolicy: 'use_external',
        rationale: 'Linear status updates drive bidirectional sync for tasks.',
      },
      title: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Task scope is maintained by internal product/engineering.',
      },
    },
    request: {
      status: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Request lifecycle is governed by internal workflow.',
      },
      votes: {
        owner: 'internal',
        conflictPolicy: 'merge',
        rationale: 'Votes aggregate internal and deduplicated signals.',
      },
    },
    transcript: {
      transcriptText: {
        owner: 'external',
        conflictPolicy: 'use_external',
        rationale: 'Transcript payload originates from Fireflies connector.',
      },
    },
    event: {
      occurredAt: {
        owner: 'internal',
        conflictPolicy: 'keep_internal',
        rationale: 'Event timeline is immutable in internal event backbone.',
      },
    },
  };
  private readonly lastReconciliationByOrganization = new Map<
    string,
    ReconciliationResult
  >();

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

  getOwnershipContracts(organizationId: string) {
    return {
      organizationId,
      version: 'v1',
      generatedAt: new Date().toISOString(),
      domains: this.ownershipContracts,
    };
  }

  async configureLinearWebhookSecurity(
    input: LinearWebhookSecurityConfigInput,
    actor: AuthenticatedUser,
  ) {
    await this.integrationConfigsRepository.upsertLinearWebhookSecurityConfig(
      actor.organizationId,
      {
        signingSecret: input.signingSecret,
        toleranceSeconds: input.toleranceSeconds,
      },
    );

    return {
      configured: true,
      organizationId: actor.organizationId,
      toleranceSeconds: input.toleranceSeconds,
      signingSecretMasked: this.maskSecret(input.signingSecret),
    };
  }

  async reconcileIntegrations(
    input: ReconcileIntegrationsInput,
    actor: AuthenticatedUser,
  ): Promise<ReconciliationResult> {
    const mappings = await this.externalMappingsRepository.listByOrganization(
      actor.organizationId,
    );

    const scopedMappings = input.provider
      ? mappings.filter((item) => item.provider === input.provider)
      : mappings;

    const seenInternal = new Set<string>();
    const seenExternal = new Set<string>();
    const divergences: ReconciliationDivergence[] = [];

    for (const mapping of scopedMappings) {
      const internalKey = `${mapping.provider}:${mapping.entityType}:${mapping.internalId}`;
      const externalKey = `${mapping.provider}:${mapping.entityType}:${mapping.externalId}`;

      if (seenInternal.has(internalKey)) {
        divergences.push({
          mappingId: mapping.id,
          provider: mapping.provider,
          entityType: mapping.entityType,
          internalId: mapping.internalId,
          externalId: mapping.externalId,
          reason: 'duplicate_internal_mapping',
          severity: 'high',
          resolved: false,
        });
      } else {
        seenInternal.add(internalKey);
      }

      if (seenExternal.has(externalKey)) {
        divergences.push({
          mappingId: mapping.id,
          provider: mapping.provider,
          entityType: mapping.entityType,
          internalId: mapping.internalId,
          externalId: mapping.externalId,
          reason: 'duplicate_external_mapping',
          severity: 'high',
          resolved: false,
        });
      } else {
        seenExternal.add(externalKey);
      }

      const hasInternal = await this.mappingHasInternalReference(
        mapping,
        actor.organizationId,
      );

      if (!hasInternal) {
        const divergence: ReconciliationDivergence = {
          mappingId: mapping.id,
          provider: mapping.provider,
          entityType: mapping.entityType,
          internalId: mapping.internalId,
          externalId: mapping.externalId,
          reason: 'missing_internal_reference',
          severity: 'medium',
          resolved: false,
        };

        if (!input.dryRun && input.autoResolveMissingInternal) {
          await this.externalMappingsRepository.deleteById(
            mapping.id,
            actor.organizationId,
          );
          divergence.resolved = true;
        }

        divergences.push(divergence);
      }
    }

    const result: ReconciliationResult = {
      reconciledAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      provider: input.provider,
      dryRun: input.dryRun,
      scanned: scopedMappings.length,
      resolved: divergences.filter((item) => item.resolved).length,
      pending: divergences.filter((item) => !item.resolved).length,
      divergences,
    };

    this.lastReconciliationByOrganization.set(actor.organizationId, result);

    this.domainEventsService.publish({
      name: 'integrations.reconciliation_executed',
      occurredAt: result.reconciledAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        provider: input.provider,
        dryRun: input.dryRun,
        scanned: result.scanned,
        resolved: result.resolved,
        pending: result.pending,
      },
    });

    return result;
  }

  async reprocessIntegrations(
    input: ReprocessIntegrationsInput,
    actor: AuthenticatedUser,
  ) {
    this.domainEventsService.publish({
      name: 'integrations.reprocess_triggered',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        provider: input.provider,
        taskIds: input.taskIds,
        resetCursor: input.resetCursor,
      },
    });

    if (input.provider === IntegrationProvider.Linear) {
      const result = await this.syncLinear(
        {
          taskIds: input.taskIds,
        },
        actor,
      );

      return {
        provider: input.provider,
        reprocessed: result.synced,
      };
    }

    if (input.provider === IntegrationProvider.Slack) {
      if (input.resetCursor) {
        await this.integrationCursorsRepository.set(
          actor.organizationId,
          IntegrationProvider.Slack,
          0,
        );
      }

      const result = await this.syncSlackStatusEvents(actor);
      return {
        provider: input.provider,
        reprocessed: result.delivered,
      };
    }

    if (input.provider === IntegrationProvider.HubSpot) {
      return {
        provider: input.provider,
        reprocessed: 0,
        skippedReason:
          'HubSpot reprocess requires explicit payload replay for safety.',
      };
    }

    return {
      provider: input.provider,
      reprocessed: 0,
      skippedReason:
        'Fireflies transcript replay requires original transcript payload.',
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
        const current = await this.companiesService.findOneById(
          existingMap.internalId,
          actor.organizationId,
        );

        const nameResolution = this.resolveConflictValue(
          'company',
          'name',
          current.name,
          item.name,
          IntegrationProvider.HubSpot,
        );
        const revenueResolution = this.resolveConflictValue(
          'company',
          'revenue',
          current.revenue,
          item.revenue,
          IntegrationProvider.HubSpot,
        );

        const updateInput: {
          name?: string;
          revenue?: number;
        } = {};

        if (nameResolution.value !== current.name) {
          updateInput.name = nameResolution.value;
        }

        if (revenueResolution.value !== current.revenue) {
          updateInput.revenue = revenueResolution.value;
        }

        if (Object.keys(updateInput).length > 0) {
          await this.companiesService.update(
            existingMap.internalId,
            updateInput,
            actor,
          );
        }

        this.auditExternalMutation(actor, {
          provider: IntegrationProvider.HubSpot,
          entityType: 'company',
          internalId: existingMap.internalId,
          externalId: item.externalCompanyId,
          decisions: {
            name: nameResolution,
            revenue: revenueResolution,
          },
        });
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
        const current = await this.customersService.findOneById(
          existingMap.internalId,
          actor.organizationId,
        );

        const nameResolution = this.resolveConflictValue(
          'customer',
          'name',
          current.name,
          item.name,
          IntegrationProvider.HubSpot,
        );
        const emailResolution = this.resolveConflictValue(
          'customer',
          'email',
          current.email,
          item.email,
          IntegrationProvider.HubSpot,
        );
        const companyResolution = this.resolveConflictValue(
          'customer',
          'companyId',
          current.companyId,
          mappedCompany,
          IntegrationProvider.HubSpot,
        );

        const updateInput: {
          name?: string;
          email?: string;
          companyId?: string | null;
        } = {};

        if (nameResolution.value !== current.name) {
          updateInput.name = nameResolution.value;
        }

        if (emailResolution.value !== current.email) {
          updateInput.email = emailResolution.value;
        }

        if (companyResolution.value !== current.companyId) {
          updateInput.companyId = companyResolution.value ?? null;
        }

        if (Object.keys(updateInput).length > 0) {
          await this.customersService.update(
            existingMap.internalId,
            updateInput,
            actor,
          );
        }

        this.auditExternalMutation(actor, {
          provider: IntegrationProvider.HubSpot,
          entityType: 'customer',
          internalId: existingMap.internalId,
          externalId: item.externalCustomerId,
          decisions: {
            name: nameResolution,
            email: emailResolution,
            companyId: companyResolution,
          },
        });
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
    const webhookConfig =
      await this.integrationConfigsRepository.findLinearWebhookSecurityConfig(
        actor.organizationId,
      );

    if (webhookConfig) {
      this.assertLinearWebhookSignature(
        input,
        webhookConfig.signingSecret,
        webhookConfig.toleranceSeconds,
        actor,
      );
    }

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

    const hasLinearWebhookSecurity = Boolean(
      await this.integrationConfigsRepository.findLinearWebhookSecurityConfig(
        organizationId,
      ),
    );

    return {
      slackConfigured: hasSlackConfig,
      firefliesConfigured: hasFirefliesConfig,
      linearWebhookSecurityConfigured: hasLinearWebhookSecurity,
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

  async getOperationalDashboard(organizationId: string) {
    const [
      status,
      slackMetrics,
      hubspotMetrics,
      linearMetrics,
      firefliesMetrics,
    ] = await Promise.all([
      this.getStatus(organizationId),
      this.getMetrics(organizationId, IntegrationProvider.Slack),
      this.getMetrics(organizationId, IntegrationProvider.HubSpot),
      this.getMetrics(organizationId, IntegrationProvider.Linear),
      this.getMetrics(organizationId, IntegrationProvider.Fireflies),
    ]);

    const providers = {
      slack: this.toProviderDashboard(slackMetrics),
      hubspot: this.toProviderDashboard(hubspotMetrics),
      linear: this.toProviderDashboard(linearMetrics),
      fireflies: this.toProviderDashboard(firefliesMetrics),
    };

    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;

    const conflictsLast24h = this.domainEventsService
      .list()
      .filter((event) => event.organizationId === organizationId)
      .filter((event) => event.name === 'integrations.conflict_detected')
      .filter((event) => Date.parse(event.occurredAt) >= cutoff).length;

    const failuresByProvider = {
      slack: 0,
      hubspot: 0,
      linear: 0,
      fireflies: 0,
    };

    for (const event of this.domainEventsService.list()) {
      if (
        event.organizationId !== organizationId ||
        event.name !== 'integrations.provider_call_failed' ||
        Date.parse(event.occurredAt) < cutoff
      ) {
        continue;
      }

      const provider = (event.payload as Record<string, unknown>).provider;
      if (provider === IntegrationProvider.Slack) {
        failuresByProvider.slack += 1;
      } else if (provider === IntegrationProvider.HubSpot) {
        failuresByProvider.hubspot += 1;
      } else if (provider === IntegrationProvider.Linear) {
        failuresByProvider.linear += 1;
      } else if (provider === IntegrationProvider.Fireflies) {
        failuresByProvider.fireflies += 1;
      }
    }

    const lastReconciliation =
      this.lastReconciliationByOrganization.get(organizationId);

    return {
      generatedAt: new Date().toISOString(),
      sourceOfTruth: {
        version: 'v1',
        domains: Object.keys(this.ownershipContracts).length,
      },
      status,
      providers,
      operational: {
        conflictsLast24h,
        failuresLast24hByProvider: failuresByProvider,
        lastReconciliation,
      },
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

        this.domainEventsService.publish({
          name: 'integrations.provider_call_succeeded',
          occurredAt: new Date().toISOString(),
          organizationId,
          payload: {
            provider,
            correlationId,
            attempt,
          },
        });

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

        this.domainEventsService.publish({
          name: 'integrations.provider_call_failed',
          occurredAt: new Date().toISOString(),
          organizationId,
          payload: {
            provider,
            correlationId,
            attempt,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    throw lastError;
  }

  private async mappingHasInternalReference(
    mapping: ExternalMappingEntity,
    organizationId: string,
  ): Promise<boolean> {
    try {
      if (mapping.entityType === 'company') {
        await this.companiesService.findOneById(
          mapping.internalId,
          organizationId,
        );
        return true;
      }

      if (mapping.entityType === 'customer') {
        await this.customersService.findOneById(
          mapping.internalId,
          organizationId,
        );
        return true;
      }

      if (mapping.entityType === 'task') {
        await this.engineeringService.getTaskById(
          mapping.internalId,
          organizationId,
        );
        return true;
      }

      return true;
    } catch {
      return false;
    }
  }

  private resolveConflictValue<T>(
    entityType: OwnershipEntityType,
    field: string,
    internalValue: T | undefined,
    externalValue: T | undefined,
    provider: IntegrationProvider,
  ): {
    value: T | undefined;
    decision: 'kept_internal' | 'applied_external' | 'merged';
    conflict: boolean;
    provider: IntegrationProvider;
  } {
    const fieldRule = this.ownershipContracts[entityType]?.[field];

    if (externalValue === undefined) {
      return {
        value: internalValue,
        decision: 'kept_internal',
        conflict: false,
        provider,
      };
    }

    if (internalValue === undefined) {
      return {
        value: externalValue,
        decision: 'applied_external',
        conflict: false,
        provider,
      };
    }

    const equals =
      JSON.stringify(internalValue) === JSON.stringify(externalValue);
    if (equals) {
      return {
        value: internalValue,
        decision: 'kept_internal',
        conflict: false,
        provider,
      };
    }

    if (!fieldRule || fieldRule.conflictPolicy === 'keep_internal') {
      return {
        value: internalValue,
        decision: 'kept_internal',
        conflict: true,
        provider,
      };
    }

    if (fieldRule.conflictPolicy === 'use_external') {
      return {
        value: externalValue,
        decision: 'applied_external',
        conflict: true,
        provider,
      };
    }

    if (Array.isArray(internalValue) && Array.isArray(externalValue)) {
      const merged = Array.from(
        new Set([...internalValue, ...externalValue]),
      ) as T;
      return {
        value: merged,
        decision: 'merged',
        conflict: true,
        provider,
      };
    }

    return {
      value: internalValue,
      decision: 'kept_internal',
      conflict: true,
      provider,
    };
  }

  private auditExternalMutation(
    actor: AuthenticatedUser,
    input: {
      provider: IntegrationProvider;
      entityType: ExternalMappingEntity['entityType'];
      internalId: string;
      externalId: string;
      decisions: Record<
        string,
        {
          value: unknown;
          decision: 'kept_internal' | 'applied_external' | 'merged';
          conflict: boolean;
          provider: IntegrationProvider;
        }
      >;
    },
  ): void {
    const conflictFields = Object.entries(input.decisions)
      .filter(([, decision]) => decision.conflict)
      .map(([field]) => field);

    this.domainEventsService.publish({
      name: 'integrations.external_mutation_audited',
      occurredAt: new Date().toISOString(),
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        provider: input.provider,
        entityType: input.entityType,
        internalId: input.internalId,
        externalId: input.externalId,
        decisions: Object.fromEntries(
          Object.entries(input.decisions).map(([field, value]) => [
            field,
            {
              decision: value.decision,
              conflict: value.conflict,
            },
          ]),
        ),
      },
    });

    if (conflictFields.length > 0) {
      this.domainEventsService.publish({
        name: 'integrations.conflict_detected',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          provider: input.provider,
          entityType: input.entityType,
          internalId: input.internalId,
          externalId: input.externalId,
          conflictFields,
        },
      });
    }
  }

  private assertLinearWebhookSignature(
    input: LinearWebhookTaskStatusInput,
    signingSecret: string,
    toleranceSeconds: number,
    actor: AuthenticatedUser,
  ): void {
    if (!input.timestamp || !input.signature) {
      throw new BadRequestException(
        'Webhook signature and timestamp are required for Linear webhook.',
      );
    }

    const rawTs = Number(input.timestamp);
    if (!Number.isFinite(rawTs) || rawTs <= 0) {
      throw new BadRequestException('Invalid webhook timestamp.');
    }

    const timestampMs = rawTs > 1_000_000_000_000 ? rawTs : rawTs * 1000;
    const maxDriftMs = toleranceSeconds * 1000;

    if (Math.abs(Date.now() - timestampMs) > maxDriftMs) {
      throw new ForbiddenException('Webhook timestamp is outside tolerance.');
    }

    const providedSignature = input.signature.replace(/^sha256=/i, '');
    const basePayload = `${input.timestamp}.${input.externalIssueId}.${input.status}`;
    const expectedSignature = createHmac('sha256', signingSecret)
      .update(basePayload)
      .digest('hex');

    if (!this.safeCompareSignatures(providedSignature, expectedSignature)) {
      this.domainEventsService.publish({
        name: 'integrations.webhook_signature_rejected',
        occurredAt: new Date().toISOString(),
        actorId: actor.id,
        organizationId: actor.organizationId,
        payload: {
          provider: IntegrationProvider.Linear,
          externalIssueId: input.externalIssueId,
        },
      });

      throw new ForbiddenException('Invalid webhook signature.');
    }
  }

  private safeCompareSignatures(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }

  private toProviderDashboard(
    metrics: IntegrationMetrics,
  ): ProviderDashboardItem {
    const total = metrics.success + metrics.failure;
    const failureRate =
      total === 0 ? 0 : Number((metrics.failure / total).toFixed(4));
    const availability =
      total === 0 ? 1 : Number((metrics.success / total).toFixed(4));

    const status: ProviderDashboardItem['status'] =
      failureRate < 0.02 ? 'healthy' : failureRate < 0.15 ? 'degraded' : 'down';

    return {
      success: metrics.success,
      failure: metrics.failure,
      total,
      failureRate,
      availability,
      status,
    };
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
