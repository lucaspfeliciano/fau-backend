import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { outboxRepositoryMockProvider } from '../common/events/outbox-repository.mock';
import { CompaniesService } from './companies.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CompanyEntity } from './entities/company.entity';
import { CompaniesRepository } from './repositories/companies.repository';

describe('CompaniesService', () => {
  let companiesService: CompaniesService;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const companies = new Map<string, CompanyEntity>();

    const companiesRepositoryMock: Pick<
      CompaniesRepository,
      'insert' | 'update' | 'listByOrganization' | 'findById'
    > = {
      async insert(company) {
        companies.set(company.id, company);
      },

      async update(company) {
        companies.set(company.id, company);
      },

      async listByOrganization(organizationId) {
        return [...companies.values()].filter(
          (company) => company.organizationId === organizationId,
        );
      },

      async findById(id, organizationId) {
        const company = [...companies.values()].find(
          (item) => item.id === id && item.organizationId === organizationId,
        );

        return company ?? undefined;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        outboxRepositoryMockProvider,
        DomainEventsService,
        {
          provide: CompaniesRepository,
          useValue: companiesRepositoryMock,
        },
      ],
    }).compile();

    companiesService = module.get<CompaniesService>(CompaniesService);
  });

  it('should create and update company', async () => {
    const created = await companiesService.create(
      {
        name: 'Acme',
        revenue: 1000,
      },
      actor,
    );

    expect(created.name).toBe('Acme');

    const updated = await companiesService.update(
      created.id,
      {
        name: 'Acme Corp',
      },
      actor,
    );

    expect(updated.name).toBe('Acme Corp');
  });
});
