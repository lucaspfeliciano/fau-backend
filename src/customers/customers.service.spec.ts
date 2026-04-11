import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from './customers.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';

describe('CustomersService', () => {
  let customersService: CustomersService;
  let companiesService: CompaniesService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, CompaniesService, DomainEventsService],
    }).compile();

    customersService = module.get<CustomersService>(CustomersService);
    companiesService = module.get<CompaniesService>(CompaniesService);
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
