import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import { AiProcessingService } from '../ai-processing/ai-processing.service';
import { TaskStatus } from '../engineering/entities/task-status.enum';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector } from './connectors/slack.connector';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let integrationsService: IntegrationsService;
  let requestsService: RequestsService;
  let productService: ProductService;
  let engineeringService: EngineeringService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        SlackConnector,
        HubSpotConnector,
        LinearConnector,
        DomainEventsService,
        CompaniesService,
        CustomersService,
        RequestsService,
        ProductService,
        EngineeringService,
        AiProcessingService,
      ],
    }).compile();

    integrationsService = module.get<IntegrationsService>(IntegrationsService);
    requestsService = module.get<RequestsService>(RequestsService);
    productService = module.get<ProductService>(ProductService);
    engineeringService = module.get<EngineeringService>(EngineeringService);
  });

  it('should configure slack and sync status events', async () => {
    integrationsService.configureSlack(
      {
        webhookUrl: 'https://hooks.slack.com/services/T000/B000/ok',
      },
      actor,
    );

    const request = requestsService.create(
      {
        title: 'Need dark mode',
        description: 'Customers asked dark mode.',
      },
      actor,
    );

    requestsService.update(
      request.id,
      {
        status: 'Planned',
      },
      actor,
    );

    const syncResult = await integrationsService.syncSlackStatusEvents(actor);
    expect(syncResult.delivered).toBeGreaterThanOrEqual(1);
  });

  it('should sync task to linear and apply webhook status', async () => {
    const request = requestsService.create(
      {
        title: 'Need export',
        description: 'Customers requested export CSV.',
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Export v2',
        description: 'Better export flow.',
        requestIds: [request.id],
      },
      actor,
    );

    const task = engineeringService.createTask(
      {
        title: 'Implement export endpoint',
        description: 'Create endpoint for export.',
        featureId: feature.id,
      },
      actor,
    );

    const syncResult = await integrationsService.syncLinear(
      {
        taskIds: [task.id],
      },
      actor,
    );

    expect(syncResult.synced).toBe(1);

    const webhookResult = integrationsService.handleLinearWebhookTaskStatus(
      {
        externalIssueId: `linear-${task.id}`,
        status: TaskStatus.Done,
      },
      actor,
    );

    expect(webhookResult.task.status).toBe(TaskStatus.Done);
  });

  it('should sync hubspot payload into companies and customers', async () => {
    const result = await integrationsService.syncHubSpot(
      {
        companies: [
          {
            externalCompanyId: 'hs-company-1',
            name: 'Acme',
            revenue: 400000,
          },
        ],
        customers: [
          {
            externalCustomerId: 'hs-contact-1',
            name: 'Alice',
            email: 'alice@acme.com',
            externalCompanyId: 'hs-company-1',
          },
        ],
      },
      actor,
    );

    expect(result.companiesSynced).toBe(1);
    expect(result.customersSynced).toBe(1);
  });
});
