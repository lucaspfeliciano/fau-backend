import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import { TestingRequestsRepository } from '../requests/repositories/testing-requests.repository';
import { REQUESTS_REPOSITORY } from '../requests/repositories/requests-repository.interface';
import { CustomersService } from '../customers/customers.service';
import { CompaniesService } from '../companies/companies.service';
import { EngineeringService } from './engineering.service';
import { SprintStatus } from './entities/sprint-status.enum';
import { TaskStatus } from './entities/task-status.enum';

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringService,
        ProductService,
        DomainEventsService,
        RequestsService,
        TestingRequestsRepository,
        {
          provide: REQUESTS_REPOSITORY,
          useExisting: TestingRequestsRepository,
        },
        CustomersService,
        CompaniesService,
      ],
    }).compile();

    engineeringService = module.get<EngineeringService>(EngineeringService);
    productService = module.get<ProductService>(ProductService);
    requestsService = module.get<RequestsService>(RequestsService);
  });

  it('should require valid feature when creating task', () => {
    expect(() =>
      engineeringService.createTask(
        {
          title: 'Task without feature',
          description: 'Should fail.',
          featureId: 'missing-feature',
        },
        actor,
      ),
    ).toThrow('Feature not found.');
  });

  it('should prevent sprint completion with open tasks without closeReason', () => {
    const productRequest = requestsService.create(
      {
        title: 'Need onboarding changes',
        description: 'Customers ask for better onboarding.',
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Onboarding improvements',
        description: 'Deliver guided setup.',
        requestIds: [productRequest.id],
      },
      actor,
    );

    const sprint = engineeringService.createSprint(
      {
        name: 'Sprint A',
        startDate: '2026-04-10T00:00:00.000Z',
        endDate: '2026-04-20T00:00:00.000Z',
      },
      actor,
    );

    engineeringService.createTask(
      {
        title: 'Task A',
        description: 'Pending task in sprint.',
        featureId: feature.id,
        sprintId: sprint.id,
      },
      actor,
    );

    expect(() =>
      engineeringService.updateSprint(
        sprint.id,
        {
          status: SprintStatus.Completed,
        },
        actor,
      ),
    ).toThrow(BadRequestException);
  });

  it('should update feature status automatically based on task status', () => {
    const productRequest = requestsService.create(
      {
        title: 'Need reporting export',
        description: 'CSV export requested by customers.',
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Reporting export',
        description: 'Export capabilities for reports.',
        requestIds: [productRequest.id],
      },
      actor,
    );

    const task = engineeringService.createTask(
      {
        title: 'Implement export endpoint',
        description: 'Create endpoint and payload.',
        featureId: feature.id,
      },
      actor,
    );

    const afterCreate = productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterCreate.status).toBe('Planned');

    engineeringService.updateTask(
      task.id,
      {
        status: TaskStatus.InProgress,
      },
      actor,
    );

    const afterInProgress = productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterInProgress.status).toBe('In Progress');

    engineeringService.updateTask(
      task.id,
      {
        status: TaskStatus.Done,
      },
      actor,
    );

    const afterDone = productService.findFeatureById(
      feature.id,
      actor.organizationId,
    );
    expect(afterDone.status).toBe('Done');
  });
});
