import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import type { CompanyEntity } from '../companies/entities/company.entity';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from './customers.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CustomerEntity } from './entities/customer.entity';
import { CustomersRepository } from './repositories/customers.repository';

describe('CustomersService', () => {
  let customersService: CustomersService;
  let companiesService: Pick<CompaniesService, 'create' | 'findOneById'>;

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
          throw new Error('Company not found.');
        }

        return company;
      },
    };

    const customersRepositoryMock: Pick<
      CustomersRepository,
      'insert' | 'update' | 'listByOrganization' | 'findById' | 'findByEmail'
    > = {
      async insert(customer) {
        customers.set(customer.id, customer);
      },

      async update(customer) {
        customers.set(customer.id, customer);
      },

      async listByOrganization(organizationId) {
        return [...customers.values()].filter(
          (customer) => customer.organizationId === organizationId,
        );
      },

      async findById(id, organizationId) {
        const customer = [...customers.values()].find(
          (item) => item.id === id && item.organizationId === organizationId,
        );

        return customer ?? undefined;
      },

      async findByEmail(email, organizationId) {
        const normalizedEmail = email.toLowerCase();
        const customer = [...customers.values()].find(
          (item) =>
            item.email.toLowerCase() === normalizedEmail &&
            item.organizationId === organizationId,
        );

        return customer ?? undefined;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        DomainEventsService,
        {
          provide: CompaniesService,
          useValue: companiesServiceMock,
        },
        {
          provide: CustomersRepository,
          useValue: customersRepositoryMock,
        },
      ],
    }).compile();

    customersService = module.get<CustomersService>(CustomersService);
    companiesService = module.get(CompaniesService);
  });

  it('should create customer linked to company', async () => {
    const company = await companiesService.create(
      {
        name: 'Acme',
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

    expect(customer.email).toBe('alice@acme.com');
    expect(customer.companyId).toBe(company.id);
  });

  it('should update customer and detach company with null', async () => {
    const customer = await customersService.create(
      {
        name: 'Bob',
        email: 'bob@acme.com',
      },
      actor,
    );

    const updated = await customersService.update(
      customer.id,
      {
        companyId: null,
        name: 'Bob Silva',
      },
      actor,
    );

    expect(updated.companyId).toBeUndefined();
    expect(updated.name).toBe('Bob Silva');
  });
});
