import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
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
    };

    const externalMappingsRepositoryMock: Pick<
      ExternalMappingsRepository,
      'findByInternal' | 'findByExternal' | 'upsert' | 'listByOrganization'
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
    };

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
            upsertIssue: jest.fn(async () => ({
              externalIssueId: `linear-${randomUUID()}`,
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
          useValue: {
            listTasks: jest.fn(async () => ({
              items: [],
              page: 1,
              limit: 1000,
              total: 0,
              totalPages: 0,
            })),
            getTaskById: jest.fn(),
            updateTask: jest.fn(),
          },
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
        IntegrationProvider.Firefl