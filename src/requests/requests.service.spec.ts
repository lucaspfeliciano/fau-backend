import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from '../customers/customers.service';
import { Role } from '../common/auth/role.enum';
import { RequestsService } from './requests.service';
import { RequestStatus } from './entities/request-status.enum';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { TestingRequestsRepository } from './repositories/testing-requests.repository';
import { REQUESTS_REPOSITORY } from './repositories/requests-repository.interface';

describe('RequestsService', () => {
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
        RequestsService,
        TestingRequestsRepository,
        {
          provide: REQUESTS_REPOSITORY,
          useExisting: TestingRequestsRepository,
        },
        DomainEventsService,
        CompaniesService,
        CustomersService,
      ],
    }).compile();

    requestsService = module.get<RequestsService>(RequestsService);
    companiesService = module.get<CompaniesService>(CompaniesService);
    customersService = module.get<CustomersService>(CustomersService);
  });

  it('should create request with initial vote and status history', async () => {
    const request = await requestsService.create(
      {
        title: 'Need dark mode',
        description: 'Customers asked for dark mode support.',
        tags: ['ui', 'UX', 'ui'],
      },
      actor,
    );

    expect(request.votes).toBe(1);
    expect(request.status).toBe(RequestStatus.Backlog);
    expect(request.tags).toEqual(['ui', 'UX']);
    expect(request.statusHistory).toHaveLength(1);
    expect(request.statusHistory[0]?.to).toBe(RequestStatus.Backlog);
  });

  it('should update status and append status history', async () => {
    const request = await requestsService.create(
      {
        title: 'Export CSV',
        description: 'Need export CSV in reports.',
      },
      actor,
    );

    const updated = await requestsService.update(
      request.id,
      { status: RequestStatus.Planned },
      actor,
    );

    expect(updated.status).toBe(RequestStatus.Planned);
    expect(updated.statusHistory).toHaveLength(2);
    expect(updated.statusHistory[1]?.from).toBe(RequestStatus.Backlog);
    expect(updated.statusHistory[1]?.to).toBe(RequestStatus.Planned);
  });

  it('should archive request and remove it from default list', async () => {
    const request = await requestsService.create(
      {
        title: 'Legacy cleanup',
        description: 'Cleanup old section.',
      },
      actor,
    );

    await requestsService.archive(request.id, actor);

    const list = await requestsService.list(
      {
        page: 1,
        limit: 20,
        includeArchived: false,
      },
      actor.organizationId,
    );

    expect(list.items).toHaveLength(0);
  });

  it('should increment votes', async () => {
    const request = await requestsService.create(
      {
        title: 'Improve logs',
        description: 'Need better logs for support team.',
      },
      actor,
    );

    const voted = await requestsService.vote(request.id, actor);
    expect(voted.votes).toBe(2);
  });

  it('should link and unlink customer and company to request', async () => {
    const request = await requestsService.create(
      {
        title: 'Link relations',
        description: 'Need relation links.',
      },
      actor,
    );

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

    const linkedCustomer = await requestsService.linkCustomer(
      request.id,
      customer.id,
      actor,
    );
    expect(linkedCustomer.customerIds).toContain(customer.id);

    const linkedCompany = await requestsService.linkCompany(
      request.id,
      company.id,
      actor,
    );
    expect(linkedCompany.companyIds).toContain(company.id);

    const unlinkedCustomer = await requestsService.unlinkCustomer(
      request.id,
      customer.id,
      actor,
    );
    expect(unlinkedCustomer.customerIds).not.toContain(customer.id);

    const unlinkedCompany = await requestsService.unlinkCompany(
      request.id,
      company.id,
      actor,
    );
    expect(unlinkedCompany.companyIds).not.toContain(company.id);
  });
});
