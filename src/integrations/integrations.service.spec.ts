import { Test, TestingModule } from '@nestjs/testing';
import { createHmac, randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { TaskStatus } from '../engineering/entities/task-status.enum';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import { IntegrationProvider } from './entities/integration-provider.enum';
import { ExternalMappingsRepository } from './repositories/external-mappings.repository';
import { IntegrationConfigsRepository } from './repositories/integration-configs.repository';
import { IntegrationCursorsRepository } from './repositories/integration-cursors.repository';
import { IntegrationMetricsRepository } from './repositories/integration-metrics.repository';
import { FirefliesConnector } from './connectors/fireflies.connector';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector } from './connectors/slack.connector';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let integrationsService: IntegrationsService;
  let engineeringService: jest.Mocked<
    Pick<EngineeringService, 'listTasks' | 'getTaskById' | 'updateTask'>
  >;
  let externalMappingsRepository: Pick<
    ExternalMappingsRepository,
    'upsert' | 'listByOrganization'
  >;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const configStore = new Map<string, Record<string, unknown>>();
    const mappings = new Map<string, Record<string, unknown>>();
    const metrics = new Map<string, { success: number; failure: number }>();

    const integrationConfigsRepositoryMock: Pick<
      IntegrationConfigsRepository,
      | 'upsertSlackConfig'
      | 'findSlackConfig'
      | 'upsertFirefliesConfig'
      | 'findFirefliesConfig'
      | 'upsertLinearWebhookSecurityConfig'
      | 'findLinearWebhookSecurityConfig'
    > = {
      async upsertSlackConfig(organizationId, config) {
        configStore.set(`${organizationId}:slack`, {
          ...config,
          updatedAt: new Date().toISOString(),
        });
      },
      async findSlackConfig(organizationId) {
        const item = configStore.get(`${organizationId}:slack`);
        if (!item || typeof item.webhookUrl !== 'string') {
          return undefined;
        }

        return {
          webhookUrl: item.webhookUrl,
          defaultChannel:
            typeof item.defaultChannel === 'string'
              ? item.defaultChannel
              : undefined,
        };
      },
      async upsertFirefliesConfig(organizationId, config) {
        configStore.set(`${organizationId}:fireflies`, {
          ...config,
          updatedAt: new Date().toISOString(),
        });
      },
      async findFirefliesConfig(organizationId) {
        const item = configStore.get(`${organizationId}:fireflies`);
        if (!item || typeof item.apiKey !== 'string') {
          return undefined;
        }

        return {
          apiKey: item.apiKey,
          workspaceId:
            typeof item.workspaceId === 'string' ? item.workspaceId : undefined,
          projectId:
            typeof item.projectId === 'string' ? item.projectId : undefined,
          defaultLanguage:
            typeof item.defaultLanguage === 'string'
              ? item.defaultLanguage
              : undefined,
          updatedAt:
            typeof item.updatedAt === 'string'
              ? item.updatedAt
              : new Date().toISOString(),
        };
      },
      async upsertLinearWebhookSecurityConfig(organizationId, config) {
        configStore.set(`${organizationId}:linear-webhook`, {
          ...config,
          updatedAt: new Date().toISOString(),
        });
      },
      async findLinearWebhookSecurityConfig(organizationId) {
        const item = configStore.get(`${organizationId}:linear-webhook`);
        if (
          !item ||
          typeof item.signingSecret !== 'string' ||
          typeof item.toleranceSeconds !== 'number'
        ) {
          return undefined;
        }

        return {
          signingSecret: item.signingSecret,
          toleranceSeconds: item.toleranceSeconds,
          updatedAt:
            typeof item.updatedAt === 'string'
              ? item.updatedAt
              : new Date().toISOString(),
        };
      },
    };

    const externalMappingsRepositoryMock: Pick<
      ExternalMappingsRepository,
      | 'findByInternal'
      | 'findByExternal'
      | 'upsert'
      | 'listByOrganization'
      | 'deleteById'
    > = {
      async findByInternal(organizationId, provider, entityType, internalId) {
        return mappings.get(
          `${organizationId}:${provider}:${entityType}:${internalId}`,
        ) as any;
      },
      async findByExternal(organizationId, provider, entityType, externalId) {
        return [...mappings.values()].find(
          (mapping: any) =>
            mapping.organizationId === organizationId &&
            mapping.provider === provider &&
            mapping.entityType === entityType &&
            mapping.externalId === externalId,
        ) as any;
      },
      async upsert(mapping) {
        mappings.set(
          `${mapping.organizationId}:${mapping.provider}:${mapping.entityType}:${mapping.internalId}`,
          mapping,
        );
      },
      async listByOrganization(organizationId) {
        return [...mappings.values()].filter(
          (mapping: any) => mapping.organizationId === organizationId,
        ) as any;
      },
      async deleteById(id, organizationId) {
        const target = [...mappings.values()].find(
          (mapping: any) =>
            mapping.id === id && mapping.organizationId === organizationId,
        ) as any;

        if (!target) {
          return;
        }

        mappings.delete(
          `${target.organizationId}:${target.provider}:${target.entityType}:${target.internalId}`,
        );
      },
    };

    externalMappingsRepository = externalMappingsRepositoryMock;

    const integrationMetricsRepositoryMock: Pick<
      IntegrationMetricsRepository,
      'increment' | 'get'
    > = {
      async increment(organizationId, provider, kind) {
        const key = `${organizationId}:${provider}`;
        const current = metrics.get(key) ?? { success: 0, failure: 0 };
        current[kind] += 1;
        metrics.set(key, current);
      },
      async get(organizationId, provider) {
        return (
          metrics.get(`${organizationId}:${provider}`) ?? {
            success: 0,
            failure: 0,
          }
        );
      },
    };

    const integrationCursorsRepositoryMock: Pick<
      IntegrationCursorsRepository,
      'get' | 'set'
    > = {
      async get() {
        return 0;
      },
      async set() {
        return;
      },
    };

    const aiProcessingServiceMock: Pick<AiProcessingService, 'importNotes'> = {
      async importNotes() {
        return {
          processedAt: new Date().toISOString(),
          sourceType: RequestSourceType.FirefliesTranscript,
          noteExternalId: 'ff-tr-1',
          totalExtractedItems: 3,
          createdRequests: 1,
          deduplicatedRequests: 1,
          mergedRequests: 0,
          queuedForReviewItems: 1,
          lowConfidenceItems: 1,
          items: [],
        };
      },
    };

    const firefliesConnectorMock: Pick<FirefliesConnector, 'importTranscript'> =
      {
        async importTranscript() {
          return {
            externalImportId: `ff-import-${randomUUID()}`,
          };
        },
      };

    const engineeringServiceMock: jest.Mocked<
      Pick<EngineeringService, 'listTasks' | 'getTaskById' | 'updateTask'>
    > = {
      listTasks: jest.fn(async () => ({
        items: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0,
      })),
      getTaskById: jest.fn(async (taskId: string) => ({
        id: taskId,
        title: `Task ${taskId}`,
        description: 'Mock task',
        featureId: 'feature-1',
        sprintId: undefined,
        status: TaskStatus.Todo,
        estimate: 3,
        requestSources: [],
        organizationId: actor.organizationId,
        createdBy: actor.id,
        statusHistory: [],
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
      })),
      updateTask: jest.fn(async (taskId: string, input) => ({
        id: taskId,
        title: `Task ${taskId}`,
        description: 'Mock task',
        featureId: 'feature-1',
        sprintId: undefined,
        status: input.status ?? TaskStatus.Todo,
        estimate: 3,
        requestSources: [],
        organizationId: actor.organizationId,
        createdBy: actor.id,
        statusHistory: [],
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
      })),
    };

    engineeringService = engineeringServiceMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        DomainEventsService,
        {
          provide: FirefliesConnector,
          useValue: firefliesConnectorMock,
        },
        {
          provide: SlackConnector,
          useValue: {
            sendMessage: jest.fn(async () => ({
              externalMessageId: `msg-${randomUUID()}`,
            })),
          },
        },
        {
          provide: HubSpotConnector,
          useValue: {
            sync: jest.fn(async () => ({ ok: true })),
          },
        },
        {
          provide: LinearConnector,
          useValue: {
            upsertIssue: jest.fn(async (task?: { id?: string }) => ({
              externalIssueId: `linear-${task?.id ?? randomUUID()}`,
            })),
          },
        },
        {
          provide: CompaniesService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EngineeringService,
          useValue: engineeringServiceMock,
        },
        {
          provide: AiProcessingService,
          useValue: aiProcessingServiceMock,
        },
        {
          provide: IntegrationConfigsRepository,
          useValue: integrationConfigsRepositoryMock,
        },
        {
          provide: ExternalMappingsRepository,
          useValue: externalMappingsRepositoryMock,
        },
        {
          provide: IntegrationMetricsRepository,
          useValue: integrationMetricsRepositoryMock,
        },
        {
          provide: IntegrationCursorsRepository,
          useValue: integrationCursorsRepositoryMock,
        },
      ],
    }).compile();

    integrationsService = module.get<IntegrationsService>(IntegrationsService);
  });

  it('should configure and read fireflies config', async () => {
    const configResult = await integrationsService.configureFireflies(
      {
        apiKey: 'ff_prod_1234567890',
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        defaultLanguage: 'pt-BR',
      },
      actor,
    );

    expect(configResult.configured).toBe(true);
    expect(configResult.apiKeyMasked).toContain('*');

    const getResult = await integrationsService.getFirefliesConfig(
      actor.organizationId,
    );

    expect(getResult.configured).toBe(true);
    expect(getResult.workspaceId).toBe('workspace-1');
    expect(getResult.apiKeyMasked).toContain('*');
  });

  it('should import fireflies transcript and return sprint 11 contract response', async () => {
    await integrationsService.configureFireflies(
      {
        apiKey: 'ff_prod_1234567890',
        workspaceId: 'workspace-1',
      },
      actor,
    );

    const result = await integrationsService.importFirefliesTranscript(
      {
        externalTranscriptId: 'ff-tr-1',
        title: 'Customer discovery call',
        transcriptText:
          'Cliente pediu dashboard por equipe e reclamou de timeout no export CSV.',
        participants: ['ana@empresa.com'],
      },
      actor,
    );

    expect(result.importId).toContain('ff-import-');
    expect(result.extractedItemsCount).toBe(3);
    expect(result.queuedForReviewCount).toBe(1);
  });

  it('should expose fireflies status and metrics', async () => {
    await integrationsService.configureFireflies(
      {
        apiKey: 'ff_prod_1234567890',
      },
      actor,
    );

    await integrationsService.importFirefliesTranscript(
      {
        externalTranscriptId: 'ff-tr-2',
        title: 'Call 2',
        transcriptText: 'Pedido de melhoria no fluxo de roadmap.',
      },
      actor,
    );

    const status = await integrationsService.getStatus(actor.organizationId);

    expect(status.firefliesConfigured).toBe(true);
    expect(status.metrics.fireflies.success).toBeGreaterThanOrEqual(1);
    expect(status.mappingsByProvider.fireflies).toBeGreaterThanOrEqual(1);
    expect(status.slackConfigured).toBe(false);
    expect(status.mappingsCount).toBeGreaterThanOrEqual(1);
    expect(status.metrics.hubspot.success).toBe(0);
    expect(status.metrics.linear.success).toBe(0);
    expect(status.metrics.slack.success).toBe(0);
    expect(status.metrics.fireflies.failure).toBe(0);
    expect(status.metrics.fireflies.success).toBeGreaterThan(0);
    expect(status.metrics.fireflies.failure).toBeLessThan(1);

    expect(
      [
        IntegrationProvider.Slack,
        IntegrationProvider.HubSpot,
        IntegrationProvider.Linear,
        IntegrationProvider.Fireflies,
      ].length,
    ).toBe(4);
  });

  it('should expose ownership contracts and operational dashboard', async () => {
    const ownership = integrationsService.getOwnershipContracts(
      actor.organizationId,
    );

    expect(ownership.version).toBe('v1');
    expect(ownership.domains.company.name.owner).toBe('internal');

    const dashboard = await integrationsService.getOperationalDashboard(
      actor.organizationId,
    );

    expect(dashboard.sourceOfTruth.version).toBe('v1');
    expect(dashboard.providers.linear.status).toBeDefined();
    expect(dashboard.status.mappingsByProvider).toBeDefined();
  });

  it('should reconcile missing internal references and auto-resolve mappings', async () => {
    await externalMappingsRepository.upsert({
      id: 'mapping-orphan-1',
      organizationId: actor.organizationId,
      provider: IntegrationProvider.Linear,
      entityType: 'task',
      internalId: 'task-missing',
      externalId: 'linear-task-missing',
      syncedAt: '2026-04-11T10:00:00.000Z',
    } as any);

    engineeringService.getTaskById.mockImplementation(
      async (taskId: string) => {
        if (taskId === 'task-missing') {
          throw new Error('Task not found');
        }

        return {
          id: taskId,
          title: `Task ${taskId}`,
          description: 'Mock task',
          featureId: 'feature-1',
          sprintId: undefined,
          status: TaskStatus.Todo,
          estimate: 3,
          requestSources: [],
          organizationId: actor.organizationId,
          createdBy: actor.id,
          statusHistory: [],
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
        } as any;
      },
    );

    const result = await integrationsService.reconcileIntegrations(
      {
        provider: IntegrationProvider.Linear,
        dryRun: false,
        autoResolveMissingInternal: true,
      },
      actor,
    );

    expect(result.scanned).toBeGreaterThanOrEqual(1);
    expect(result.resolved).toBeGreaterThanOrEqual(1);

    const remaining = await externalMappingsRepository.listByOrganization(
      actor.organizationId,
    );
    expect(remaining.some((item: any) => item.id === 'mapping-orphan-1')).toBe(
      false,
    );
  });

  it('should validate linear webhook signatures and support selective reprocess', async () => {
    await integrationsService.configureLinearWebhookSecurity(
      {
        signingSecret: 'linear_secret_123456789',
        toleranceSeconds: 300,
      },
      actor,
    );

    await integrationsService.syncLinear(
      {
        taskIds: ['task-1'],
      },
      actor,
    );

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', 'linear_secret_123456789')
      .update(`${timestamp}.linear-task-1.${TaskStatus.Done}`)
      .digest('hex');

    const webhookResult =
      await integrationsService.handleLinearWebhookTaskStatus(
        {
          externalIssueId: 'linear-task-1',
          status: TaskStatus.Done,
          timestamp,
          signature,
        },
        actor,
      );

    expect(webhookResult.source).toBe(IntegrationProvider.Linear);

    await expect(
      integrationsService.handleLinearWebhookTaskStatus(
        {
          externalIssueId: 'linear-task-1',
          status: TaskStatus.Done,
          timestamp,
          signature: 'invalid-signature',
        },
        actor,
      ),
    ).rejects.toThrow();

    const reprocessLinear = await integrationsService.reprocessIntegrations(
      {
        provider: IntegrationProvider.Linear,
        taskIds: ['task-1'],
      },
      actor,
    );
    expect(reprocessLinear.reprocessed).toBeGreaterThanOrEqual(1);

    const reprocessHubSpot = await integrationsService.reprocessIntegrations(
      {
        provider: IntegrationProvider.HubSpot,
      },
      actor,
    );
    expect(reprocessHubSpot.reprocessed).toBe(0);
    expect(reprocessHubSpot.skippedReason).toContain(
      'requires explicit payload',
    );
  });
});
