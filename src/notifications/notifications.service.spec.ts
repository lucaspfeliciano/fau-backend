import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { outboxRepositoryMockProvider } from '../common/events/outbox-repository.mock';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import type {
  NotificationEntity,
  NotificationPreferenceEntity,
} from './entities/notification.entity';
import type { ReleaseEntity } from './entities/release.entity';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';
import { NotificationsRepository } from './repositories/notifications.repository';
import { ReleasesRepository } from './repositories/releases.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let domainEventsService: DomainEventsService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  const flushDomainEvents = async () => {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  };

  beforeEach(async () => {
    const notificationsStore: NotificationEntity[] = [];
    const preferencesStore = new Map<string, NotificationPreferenceEntity>();
    const releasesStore: ReleaseEntity[] = [];

    const notificationsRepositoryMock: Pick<
      NotificationsRepository,
      'insert' | 'listByOrganization' | 'markAsRead'
    > = {
      async insert(notification) {
        notificationsStore.unshift({ ...notification });
      },
      async listByOrganization(organizationId) {
        return notificationsStore.filter(
          (notification) => notification.organizationId === organizationId,
        );
      },
      async markAsRead(notificationId, organizationId, readAt) {
        const index = notificationsStore.findIndex(
          (item) =>
            item.id === notificationId &&
            item.organizationId === organizationId,
        );

        if (index < 0) {
          return undefined;
        }

        const updated: NotificationEntity = {
          ...notificationsStore[index],
          readAt,
        };

        notificationsStore[index] = updated;
        return updated;
      },
    };

    const notificationPreferencesRepositoryMock: Pick<
      NotificationPreferencesRepository,
      'upsert' | 'findByOrganizationAndTeam' | 'listByOrganization'
    > = {
      async upsert(preference) {
        const key = `${preference.organizationId}:${preference.teamId ?? ''}`;
        preferencesStore.set(key, { ...preference });
      },
      async findByOrganizationAndTeam(organizationId, teamId) {
        const key = `${organizationId}:${teamId ?? ''}`;
        return preferencesStore.get(key);
      },
      async listByOrganization(organizationId) {
        return [...preferencesStore.values()].filter(
          (preference) => preference.organizationId === organizationId,
        );
      },
    };

    const releasesRepositoryMock: Pick<
      ReleasesRepository,
      'insert' | 'listByOrganization'
    > = {
      async insert(release) {
        releasesStore.unshift({ ...release });
      },
      async listByOrganization(organizationId) {
        return releasesStore.filter(
          (release) => release.organizationId === organizationId,
        );
      },
    };

    const requestsServiceMock: Partial<RequestsService> = {
      list: jest.fn(async () => ({
        items: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0,
      })),
      findOneById: jest.fn(async () => {
        throw new Error('Request not found');
      }),
    };

    const productServiceMock: Partial<ProductService> = {
      findFeatureById: jest.fn(async (featureId: string) => ({
        id: featureId,
      })),
      listFeatures: jest.fn(async () => ({
        items: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0,
      })),
    };

    const engineeringServiceMock: Partial<EngineeringService> = {
      getSprintProgress: jest.fn(async (sprintId: string) => ({
        sprint: {
          id: sprintId,
        },
        totals: {
          totalTasks: 0,
          todoTasks: 0,
          inProgressTasks: 0,
          blockedTasks: 0,
          doneTasks: 0,
          completionRate: 0,
        },
      })),
      listSprints: jest.fn(async () => ({
        items: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0,
      })),
      listTasks: jest.fn(async () => ({
        items: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        outboxRepositoryMockProvider,
        DomainEventsService,
        {
          provide: RequestsService,
          useValue: requestsServiceMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
        {
          provide: EngineeringService,
          useValue: engineeringServiceMock,
        },
        {
          provide: CustomersService,
          useValue: {
            findOneById: jest.fn(async () => {
              throw new Error('Customer not found');
            }),
          },
        },
        {
          provide: CompaniesService,
          useValue: {
            findOneById: jest.fn(async () => {
              throw new Error('Company not found');
            }),
          },
        },
        {
          provide: NotificationsRepository,
          useValue: notificationsRepositoryMock,
        },
        {
          provide: NotificationPreferencesRepository,
          useValue: notificationPreferencesRepositoryMock,
        },
        {
          provide: ReleasesRepository,
          useValue: releasesRepositoryMock,
        },
      ],
    }).compile();

    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    domainEventsService = module.get<DomainEventsService>(DomainEventsService);
    notificationsService.onModuleInit();
  });

  it('should generate notifications from request/feature/sprint status and release events', async () => {
    domainEventsService.publish({
      name: 'request.status_changed',
      occurredAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      payload: {
        requestId: 'req-1',
        from: 'Submitted',
        to: 'Planned',
      },
    });

    domainEventsService.publish({
      name: 'product.feature_status_changed',
      occurredAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      payload: {
        featureId: 'feature-1',
        from: 'Discovery',
        to: 'In Progress',
      },
    });

    domainEventsService.publish({
      name: 'engineering.sprint_status_changed',
      occurredAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      payload: {
        sprintId: 'sprint-1',
        from: 'Planned',
        to: 'Active',
      },
    });

    await notificationsService.createRelease(
      {
        version: 'v1.0.0',
        title: 'Go-live',
        notes: 'Initial v1 release.',
      },
      actor,
    );

    await flushDomainEvents();

    const notifications = await notificationsService.listNotifications(
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

  it('should honor notification preferences and disable release notifications', async () => {
    await notificationsService.upsertPreferences(
      {
        notifyRelease: false,
      },
      actor,
    );

    await notificationsService.createRelease(
      {
        version: 'v1.0.1',
        title: 'Hotfix',
        notes: 'Hotfix release.',
      },
      actor,
    );

    await flushDomainEvents();

    const notifications = await notificationsService.listNotifications(
      actor.organizationId,
    );

    expect(
      notifications.some((item) => item.eventName === 'release.created'),
    ).toBe(false);
  });

  it('should mark notification as read for organization', async () => {
    domainEventsService.publish({
      name: 'request.status_changed',
      occurredAt: new Date().toISOString(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      payload: {
        requestId: 'req-2',
        from: 'Backlog',
        to: 'Planned',
      },
    });

    await flushDomainEvents();

    const notifications = await notificationsService.listNotifications(
      actor.organizationId,
    );

    const target = notifications[0];
    expect(target).toBeDefined();

    const marked = await notificationsService.markNotificationAsRead(
      target!.id,
      actor,
    );

    expect(marked.readAt).toBeDefined();

    const after = await notificationsService.listNotifications(
      actor.organizationId,
    );
    expect(after[0]?.readAt).toBeDefined();
  });
});
