import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from '../customers/customers.service';
import { RequestStatus } from '../requests/entities/request-status.enum';
import { RequestsService } from '../requests/requests.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { FeatureStatus } from './entities/feature-status.enum';
import { ProductPriority } from './entities/product-priority.enum';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let productService: ProductService;
  let requestsService: RequestsService;
  let companiesService: CompaniesService;
  let customersService: CustomersService;

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
        ProductService,
        DomainEventsService,
        RequestsService,
        CustomersService,
        CompaniesService,
      ],
    }).compile();

    productService = module.get<ProductService>(ProductService);
    requestsService = module.get<RequestsService>(RequestsService);
    companiesService = module.get<CompaniesService>(CompaniesService);
    customersService = module.get<CustomersService>(CustomersService);
  });

  it('should calculate initial priority from linked requests', () => {
    const request = requestsService.create(
      {
        title: 'Enterprise SSO hardening',
        description:
          'Several enterprise customers requested stronger controls.',
        tags: ['security', 'enterprise', 'strategic'],
      },
      actor,
    );

    requestsService.vote(request.id, actor);
    requestsService.vote(request.id, actor);

    const feature = productService.createFeature(
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

  it('should propagate feature status changes to linked requests', () => {
    const request = requestsService.create(
      {
        title: 'Improve onboarding flow',
        description: 'Need clearer onboarding guidance.',
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Onboarding v2',
        description: 'Reduce time-to-value for new users.',
        requestIds: [request.id],
      },
      actor,
    );

    productService.updateFeature(
      feature.id,
      {
        status: FeatureStatus.InProgress,
      },
      actor,
    );

    const requestAfterInProgress = requestsService.findOneById(
      request.id,
      actor.organizationId,
    );
    expect(requestAfterInProgress.status).toBe(RequestStatus.InProgress);

    productService.updateFeature(
      feature.id,
      {
        status: FeatureStatus.Done,
      },
      actor,
    );

    const requestAfterDone = requestsService.findOneById(
      request.id,
      actor.organizationId,
    );
    expect(requestAfterDone.status).toBe(RequestStatus.Completed);
  });

  it('should return feature traceability with impacted customers and companies', () => {
    const company = companiesService.create(
      {
        name: 'Acme Corp',
      },
      actor,
    );

    const customer = customersService.create(
      {
        name: 'Alice',
        email: 'alice@acme.com',
        companyId: company.id,
      },
      actor,
    );

    const request = requestsService.create(
      {
        title: 'Need Slack integration',
        description: 'Customers want Slack notifications.',
        customerIds: [customer.id],
        companyIds: [company.id],
      },
      actor,
    );

    const feature = productService.createFeature(
      {
        title: 'Slack notifications',
        description: 'Implement configurable Slack alerts.',
        requestIds: [request.id],
      },
      actor,
    );

    const traceability = productService.getFeatureTraceability(
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
});
