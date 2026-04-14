import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import type { CompanyEntity } from '../companies/entities/company.entity';
import { DomainEventsService } from '../common/events/domain-events.service';
import { outboxRepositoryMockProvider } from '../common/events/outbox-repository.mock';
import { CustomersService } from '../customers/customers.service';
import type { CustomerEntity } from '../customers/entities/customer.entity';
import { RequestStatus } from '../requests/entities/request-status.enum';
import { RequestsService } from '../requests/requests.service';
import { TestingRequestsRepository } from '../requests/repositories/testing-requests.repository';
import { REQUESTS_REPOSITORY } from '../requests/repositories/requests-repository.interface';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { FeatureStatus } from './entities/feature-status.enum';
import type { FeatureEntity } from './entities/feature.entity';
import type { InitiativeEntity } from './entities/initiative.entity';
import { ProductPriority } from './entities/product-priority.enum';
import { FeaturesRepository } from './repositories/features.repository';
import { InitiativesRepository } from './repositories/initiatives.repository';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let productService: ProductService;
  let requestsService: RequestsService;
  let companiesService: Pick<CompaniesService, 'create' | 'findOneById'>;
  let customersService: Pick<CustomersService, 'create' | 'findOneById'>;
  let featuresStore: Map<string, FeatureEntity>;
  let initiativesStore: Map<string, InitiativeEntity>;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    featuresStore = new Map<string, FeatureEntity>();
    initiativesStore = new Map<string, InitiativeEntity>();
    const companies = new Map<string, CompanyEntity>();
    const customers = new Map<string, CustomerEntity>();

    const companiesServiceMock: Pick<
      CompaniesService,
      'create' | 'findOneById'
    > = {
      async create(input, currentActor) {
        const now = new Date().toISOString();
        const company: CompanyEntity = {
          id: `company-${companies.size + 1}`,
          name: input.name,
          revenue: input.revenue,
          organizationId: currentActor.organizationId,
          createdBy: currentActor.id,
          createdAt: now,
          updatedAt: now,
        };
        companies.set(company.id, company);
        return company;
      },
      async findOneById(id, organizationId) {
        const company = companies.get(id);
        if (!company || company.organizationId !== organizationId) {
          throw new NotFoundException('Company not found.');
        }
        return company;
      },
    };

    const customersServiceMock: Pick<
      CustomersService,
      'create' | 'findOneById'
    > = {
      async create(input, currentActor) {
        const now = new Date().toISOString();
        const customer: CustomerEntity = {
          id: `customer-${customers.size + 1}`,
          workspaceId: currentActor.organizationId,
          name: input.name,
          email: input.email.toLowerCase(),
          companyId: input.companyId,
          organizationId: currentActor.organizationId,
          createdBy: currentActor.id,
          createdAt: now,
          updatedAt: now,
        };
        customers.set(customer.id, customer);
        return customer;
      },
      async findOneById(id, organizationId) {
        const customer = customers.get(id);
        if (!customer || customer.organizationId !== organizationId) {
          throw new NotFoundException('Customer not found.');
        }
        return customer;
      },
    };

    const featuresRepositoryMock: Pick<
      FeaturesRepository,
      'insert' | 'update' | 'findById' | 'findByIds' | 'listByOrganization'
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
      async findByIds(ids, organizationId) {
        return ids
          .map((id) => featuresStore.get(id))
          .filter(
            (feature): feature is FeatureEntity =>
              Boolean(feature && feature.organizationId === organizationId),
          );
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
      async insert(initiative) {
        initiativesStore.set(initiative.id, { ...initiative });
      },
      async update(initiative) {
        initiativesStore.set(initiative.id, { ...initiative });
      },
      async findById(id, organizationId) {
        const initiative = initiativesStore.get(id);
        if (!initiative || initiative.organizationId !== organizationId) {
          return undefined;
        }

        return initiative;
      },
      async listByOrganization(organizationId) {
        return [...initiativesStore.values()].filter(
          (initiative) => initiative.organizationId === organizationId,
        );
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
        { provide: CustomersService, useValue: customersServiceMock },
        { provide: CompaniesService, useValue: companiesServiceMock },
      ],
    }).compile();

    productService = module.get<ProductService>(ProductService);
    requestsService = module.get<RequestsService>(RequestsService);
    companiesService = companiesServiceMock;
    customersService = customersServiceMock;
  });

  it('should calculate initial priority from linked requests', async () => {
    const request = await requestsService.create(
      {
        title: 'Enterprise SSO hardening',
        description:
          'Several enterprise customers requested stronger controls.',
        tags: ['security', 'enterprise', 'strategic'],
      },
      actor,
    );

    await requestsService.vote(request.id, actor);
    await requestsService.vote(request.id, actor);

    const feature = await productService.createFeature(
      {
        title: 'SSO hardening',
        description: 'Improve SSO and permission boundaries.',
        requestIds: [request.id],
      },
      actor,
    );

    expect(feature.priorityScore).toBeGreaterThan(0);
    expect(feature.priority).toBe(ProductPriority.Medium);
  });

  it('should propagate feature status changes to linked requests', async () => {
    const request = await requestsService.create(
      {
        title: 'Improve onboarding flow',
        description: 'Need clearer onboarding guidance.',
      },
      actor,
    );

    const feature = await productService.createFeature(
      {
        title: 'Onboarding v2',
        description: 'Reduce time-to-value for new users.',
        requestIds: [request.id],
      },
      actor,
    );

    await productService.updateFeature(
      feature.id,
      {
        status: FeatureStatus.InProgress,
      },
      actor,
    );

    const requestAfterInProgress = await requestsService.findOneById(
      request.id,
      actor.organizationId,
    );
    expect(requestAfterInProgress.status).toBe(RequestStatus.InProgress);

    await productService.updateFeature(
      feature.id,
      {
        status: FeatureStatus.Done,
      },
      actor,
    );

    const requestAfterDone = await requestsService.findOneById(
      request.id,
      actor.organizationId,
    );
    expect(requestAfterDone.status).toBe(RequestStatus.Completed);
  });

  it('should return feature traceability with impacted customers and companies', async () => {
    const company = await companiesService.create(
      {
        name: 'Acme Corp',
      },
      actor,
    );

    const customer = await customersService.create(
      {
        name: 'Alice',
        email: 'alice@acme.com',
        companyId: company.id,
      },
      actor,
    );

    const request = await requestsService.create(
      {
        title: 'Need Slack integration',
        description: 'Customers want Slack notifications.',
        customerIds: [customer.id],
        companyIds: [company.id],
      },
      actor,
    );

    const feature = await productService.createFeature(
      {
        title: 'Slack notifications',
        description: 'Implement configurable Slack alerts.',
        requestIds: [request.id],
      },
      actor,
    );

    const traceability = await productService.getFeatureTraceability(
      feature.id,
      actor.organizationId,
    );

    expect(traceability.requests).toHaveLength(1);
    expect(traceability.impactedCustomers).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: customer.id })]),
    );
    expect(traceability.impactedCompanies).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: company.id })]),
    );
  });

  it('should execute request to feature to initiative flow', async () => {
    const request = await requestsService.create(
      {
        title: 'Need segmented exports',
        description: 'Enterprise accounts need export per squad.',
      },
      actor,
    );

    const initiative = await productService.createInitiative(
      {
        title: 'Analytics evolution',
        description: 'Consolidate export and visibility improvements.',
      },
      actor,
    );

    const feature = await productService.createFeature(
      {
        title: 'Segmented export',
        description: 'Add export by squad and period.',
        requestIds: [request.id],
        initiativeId: initiative.id,
      },
      actor,
    );

    expect(feature.initiativeId).toBe(initiative.id);
    expect(feature.requestIds).toContain(request.id);

    const initiativeFeatures = await productService.getInitiativeFeatures(
      initiative.id,
      actor.organizationId,
    );
    expect(initiativeFeatures.map((item) => item.id)).toContain(feature.id);

    const persistedInitiative = await productService.getInitiative(
      initiative.id,
      actor.organizationId,
    );
    expect(persistedInitiative.featureIds).toContain(feature.id);
  });
});
