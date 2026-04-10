import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
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
        NotificationsService,
        DomainEventsService,
        CompaniesService,
        CustomersService,
        RequestsService,
        ProductService,
        EngineeringService,
      ],
    }).compile();

    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    requestsService = module.get<RequestsService>(RequestsService);
    productService = module.get<ProductService>(ProductService);
    engineeringService = module.get<EngineeringService>(EngineeringService);
    notificationsService.onModuleInit();
  });

  it('should generate notifications from request/feature/sprint status and release events', () => {
    const createdRequest = requestsService.create(
      {
        title: 'Need launch updates',
        description: 'Customer requested launch update visibility.',
      },
      actor,
    );

    requestsService.update(
      createdRequest.id,
      {
        status: 'Planned',
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Launch center',
        description: 'Launch overview module.',
        requestIds: [createdRequest.id],
      },
      actor,
    );

    productService.updateFeature(
      feature.id,
      {
        status: 'In Progress',
      },
      actor,
    );

    const sprint = engineeringService.createSprint(
      {
        name: 'Sprint Launch',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-14T00:00:00.000Z',
      },
      actor,
    );

    engineeringService.updateSprint(
      sprint.id,
      {
        status: 'Active',
      },
      actor,
    );

    notificationsService.createRelease(
      {
        version: 'v1.0.0',
        title: 'Go-live',
        notes: 'Initial v1 release.',
        featureIds: [feature.id],
        sprintIds: [sprint.id],
      },
      actor,
    );

    const notifications = notificationsService.listNotifications(
      actor.organizationId,
    );
    const eventNames = notifications.map((item) => item.eventName);

    expect(eventNames).toEqual(
      expect.arrayContaining([
        'request.status_changed',
        'product.feature_status_changed',
        'engineering.sprint_status_changed',
        'release.created',
      ]),
    );
  });

  it('should honor notification preferences and disable release notifications', () => {
    notificationsService.upsertPreferences(
      {
        notifyRelease: false,
      },
      actor,
    );

    notificationsService.createRelease(
      {
        version: 'v1.0.1',
        title: 'Hotfix',
        notes: 'Hotfix release.',
      },
      actor,
    );

    const notifications = notificationsService.listNotifications(
      actor.organizationId,
    );

    expect(
      notifications.some((item) => item.eventName === 'release.created'),
    ).toBe(false);
  });
});
