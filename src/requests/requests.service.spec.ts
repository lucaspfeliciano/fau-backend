import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import type { CompanyEntity } from '../companies/entities/company.entity';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from '../customers/customers.service';
import type { CustomerEntity } from '../customers/entities/customer.entity';
import { Role } from '../common/auth/role.enum';
import { RequestsService } from './requests.service';
import { RequestSourceType } from './entities/request-source-type.enum';
import { RequestStatus } from './entities/request-status.enum';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { TestingRequestsRepository } from './repositories/testing-requests.repository';
import { REQUESTS_REPOSITORY } from './repositories/requests-repository.interface';

describe('RequestsService', () => {
  let requestsService: RequestsService;
  let companiesService: Pick<CompaniesService, 'create' | 'findOneById'>;
  let customersService: Pick<CustomersService, 'create' | 'findOneById'>;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        TestingRequestsRepository,
        {
          provide: REQUESTS_REPOSITORY,
          useExisting: TestingRequestsRepository,
        },
        DomainEventsService,
        {
          provide: CompaniesService,
          useValue: companiesServiceMock,
        },
        {
          provide: CustomersService,
          useValue: customersServiceMock,
        },
      ],
    }).compile();

    requestsService = module.get<RequestsService>(RequestsService);
    companiesService = module.get(CompaniesService);
    customersService = module.get(CustomersService);
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

  it('should filter by board and find similar requests', async () => {
    const boardRequest = await requestsService.create(
      {
        title: 'Export invoice as PDF',
        description: 'Users need invoice export as PDF file.',
        boardId: 'board-sales',
      },
      actor,
    );

    await requestsService.create(
      {
        title: 'Send Slack notifications',
        description: 'Notify support channels on updates.',
        boardId: 'board-ops',
      },
      actor,
    );

    const boardList = await requestsService.list(
      {
        page: 1,
        limit: 20,
        boardId: 'board-sales',
        includeArchived: false,
      },
      actor.organizationId,
    );

    expect(boardList.items).toHaveLength(1);
    expect(boardList.items[0]?.id).toBe(boardRequest.id);

    const similar = await requestsService.findSimilarRequests(
      actor.organizationId,
      {
        title: 'Invoice PDF export',
        details: 'Allow exporting invoices to PDF format.',
        boardId: 'board-sales',
      },
    );

    expect(similar.items.length).toBeGreaterThan(0);
    expect(similar.items[0]?.requestId).toBe(boardRequest.id);
  });

  it('should add and list request comments', async () => {
    const request = await requestsService.create(
      {
        title: 'Dashboard sorting',
        description: 'Allow sorting by newest updates.',
      },
      actor,
    );

    const comment = await requestsService.addComment(
      request.id,
      {
        comment: 'This was requested by customer success.',
      },
      actor,
    );

    const comments = await requestsService.listComments(
      request.id,
      actor.organizationId,
    );

    expect(comment.requestId).toBe(request.id);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.comment).toBe(
      'This was requested by customer success.',
    );
  });

  it('should auto-link similar requests on intelligent creation', async () => {
    const existing = await requestsService.create(
      {
        title: 'Export invoice report as PDF',
        description:
          'Finance team needs invoice report export in PDF format with filters.',
      },
      actor,
    );

    const result = await requestsService.createWithIntelligentDeduplication(
      {
        title: 'Invoice PDF export for finance',
        description:
          'Need to export invoice report in PDF format for finance team filters.',
      },
      actor,
    );

    expect(result.decision).toBe('auto_linked');
    expect(result.request.id).toBe(existing.id);
    expect(result.request.votes).toBe(2);

    const metrics = requestsService.getDeduplicationMetrics(
      actor.organizationId,
    );
    expect(metrics.autoLinked).toBe(1);
  });

  it('should auto-merge high confidence duplicate and preserve references', async () => {
    const target = await requestsService.create(
      {
        title: 'Dashboard por equipe com filtro',
        description:
          'Cliente pediu dashboard por equipe com filtro de squad e status.',
      },
      actor,
    );

    const result = await requestsService.createWithIntelligentDeduplication(
      {
        title: 'Dashboard por equipe com filtro',
        description:
          'Cliente pediu dashboard por equipe com filtro de squad e status.',
        sourceType: RequestSourceType.MeetingNotes,
      },
      actor,
    );

    expect(result.decision).toBe('auto_merged');
    expect(result.request.id).toBe(target.id);
    expect(result.mergedRequestId).toBeDefined();
    expect(result.request.mergedRequestIds).toContain(result.mergedRequestId);
    expect(result.request.votes).toBeGreaterThan(1);
  });

  it('should allow manual merge and merge reversal with metrics update', async () => {
    const target = await requestsService.create(
      {
        title: 'Relatorio financeiro consolidado',
        description: 'Consolidar relatorios financeiros por trimestre.',
      },
      actor,
    );

    const source = await requestsService.create(
      {
        title: 'Relatorio financeiro trimestral',
        description: 'Precisamos de relatorio financeiro por trimestre.',
      },
      actor,
    );

    const merged = await requestsService.manualMerge(
      source.id,
      target.id,
      actor,
      'Duplicidade confirmada pelo time de produto.',
    );

    expect(merged.mergedRequestIds).toContain(source.id);

    await requestsService.revertMerge(
      source.id,
      target.id,
      actor,
      'Falso positivo apos revisao.',
    );

    const restoredSource = await requestsService.findOneById(
      source.id,
      actor.organizationId,
    );
    expect(restoredSource.deletedAt).toBeUndefined();

    const metrics = requestsService.getDeduplicationMetrics(
      actor.organizationId,
    );
    expect(metrics.manualMerged).toBe(1);
    expect(metrics.reversals).toBe(1);
  });
});
