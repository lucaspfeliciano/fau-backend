import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { outboxRepositoryMockProvider } from '../common/events/outbox-repository.mock';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { FeatureStatus } from '../product/entities/feature-status.enum';
import type { FeatureEntity } from '../product/entities/feature.entity';
import { FeaturesRepository } from '../product/repositories/features.repository';
import { InitiativesRepository } from '../product/repositories/initiatives.repository';
import { ProductService } from '../product/product.service';
import { REQUESTS_REPOSITORY } from '../requests/repositories/requests-repository.interface';
import { TestingRequestsRepository } from '../requests/repositories/testing-requests.repository';
import { RequestsService } from '../requests/requests.service';
import { SprintStatus } from './entities/sprint-status.enum';
import type { SprintEntity } from './entities/sprint.entity';
import { TaskStatus } from './entities/task-status.enum';
import type { TaskEntity } from './entities/task.entity';
import { SprintsRepository } from './repositories/sprints.repository';
import { TasksRepository } from './repositories/tasks.repository';
import { EngineeringService } from './engineering.service';

describe('EngineeringService', () => {
  let engineeringService: EngineeringService;
  let productService: ProductService;
  let requestsService: RequestsService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const featuresStore = new Map<string, FeatureEntity>();
    const sprintsStore = new Map<string, SprintEntity>();
    const tasksStore = new Map<string, TaskEntity>();

    const featuresRepositoryMock: Pick<
      FeaturesRepository,
      'insert' | 'update' | 'findById' | 'listByOrganization'
    > = {
      async insert(feature) {
        featuresStore.set(feature.id, { ...feature });
      },
      async update(feature) {
        featuresStore.set(feature.id, { ...feature });
      },
      async findById(id, organizationId) {
        const feature = featuresStore.get(id);
        if (!feature || feature.organizationId !== organizationId) {
          return undefined;
        }
        return feature;
      },
      async listByOrganization(organizationId) {
        return [...featuresStore.values()].filter(
          (feature) => feature.organizationId === organizationId,
        );
      },
    };

    const initiativesRepositoryMock: Pick<
      InitiativesRepository,
      'insert' | 'update' | 'findById' | 'listByOrganization'
    > = {
      async insert() {},
      async update() {},
      async findById() {
        return undefined;
      },
      async listByOrganization() {
        return [];
      },
    };

    const sprintsRepositoryMock: Pick<
      SprintsRepository,
      'insert' | 'update' | 'findById' | 'listByOrganization'
    > = {
      async insert(sprint) {
        sprintsStore.set(sprint.id, { ...sprint });
      },
      async update(sprint) {
        sprintsStore.set(sprint.id, { ...sprint });
      },
      async findById(id, organizationId) {
        const sprint = sprintsStore.get(id);
        if (!sprint || sprint.organizationId !== organizationId) {
          return undefined;
        }
        return sprint;
      },
      async listByOrganization(organizationId) {
        return [...sprintsStore.values()].filter(
          (sprint) => sprint.organizationId === organizationId,
        );
      },
    };

    const tasksRepositoryMock: Pick<
      TasksRepository,
      'insert' | 'update' | 'findById' | 'listByOrganization'
    > = {
      async insert(task) {
        tasksStore.set(task.id, { ...task });
      },
      async update(task) {
        tasksStore.set(task.id, { ...task });
      },
      async findById(id, organizationId) {
        const task = tasksStore.get(id);
        if (!task || task.organizationId !== organizationId) {
          return undefined;
        }
        return task;
      },
      async listByOrganization(organizationId) {
        return [...tasksStore.values()].filter(
          (task) => task.organizationId === organizationId,
        );
      },
    };

    const customersServiceMock: Pick<CustomersService, 'findOneById'> = {
      async findOneById() {
        throw new NotFoundException('Customer not found.');
      },
    };

    const companiesServiceMock: Pick<CompaniesService, 'findOneById'> = {
      async findOneById() {
        throw new NotFoundException('Company not found.');
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringService,
        ProductService,
        outboxRepositoryMockProvider,
        DomainEventsService,
        RequestsService,
        TestingRequestsRepository,
        {
          provide: REQUESTS_REPOSITORY,
          useExisting: TestingRequestsRepository,
        },
        { provide: FeaturesRepository, useValue: featuresRepositoryMock },
        { provide: InitiativesRepository, useValue: initiativesRepositoryMock },
        { provide: SprintsRepository, useValue: sprintsRepositoryMock },
        { provide: TasksRepository, useValue: tasksRepositoryMock },
        { provide: CustomersService, useValue: customersServiceMock },
        { provide: CompaniesService, useValue: companiesServiceMock },
      ],
    }).compile();

    engineeringService = module.get<EngineeringService>(EngineeringService);
    productService = module.get<ProductService>(ProductService);
    requestsService = module.get<RequestsService>(RequestsService);
  });

  it('should require valid feature when creating task', async () => {
    await expect(
      engineeringService.createTask(
        {
          title: 'Task without feature',
          description: 'Should fail.',
          featureId: 'missing-feature',
        },
        actor,
      ),
    ).rejects.toThrow('Feature not found.');
  });

  it('should prevent sprint completion with open tasks without closeReason', async () => {
    const productRequest = await requestsService.create(
      {
        title: 'Need onboarding changes',
        description: 'Customers ask for better onboarding.',
      },
      actor,
    );

    const feature = await productService.createFeature(
      {
        title: 'Onboarding improvements',
        description: 'Deliver guided setup.',
        requestIds: [productRequest.id],
      },
      actor,
    );

    const sprint = await engineeringService.createSprint(
      {
        name: 'Sprint A',
        startDate: '2026-04-10T00:00:00.000Z',
        endDate: '2026-04-20T00:00:00.000Z',
      },
      actor,
    );

    await engineeringService.createTask(
      {
        title: 'Task A',
        description: 'Pending task in sprint.',
        featureId: feature.id,
        sprintId: sprint.id,
      },
      actor,
    );

    await expect(
      engineeringService.updateSprint(
        sprint.id,
        {
          status: SprintStatus.Completed,
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update feature status automatically based on task status', async () => {
    const productRequest = await requestsService.create(
      {
        title: 'Need reporting export',
        description: 'CSV export requested by customers.',
      },
      actor,
    );

    const feature = await productService.createFeature(
      {
        title: 'Reporting export',
        description: 'Export capabilities for reports.',
        requestIds: [productRequest.id],
      },
      actor,
    );

    const task = await engineeringService.createTask(
      {
        title: 'Implement export endpoint',
        description: 'Create endpoint and payload.',
        featureId: feature.id,
      },
      actor,
    );

    const afterCreate = await productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterCreate.status).toBe(FeatureStatus.Planned);

    await engineeringService.updateTask(
      task.id,
      {
        status: TaskStatus.InProgress,
      },
      actor,
    );

    const afterInProgress = await productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterInProgress.status).toBe(FeatureStatus.InProgress);

    await engineeringService.updateTask(
      task.id,
      {
        status: TaskStatus.Done,
      },
      actor,
    );

    const afterDone = await productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterDone.status).toBe(FeatureStatus.Done);
  });
});
