import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from './companies.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesService, DomainEventsService],
    }).compile();

    companiesService = module.get<CompaniesService>(CompaniesService);
  });

  it('should create and update company', () => {
    const created = companiesService.create(
      {
        name: 'Acme',
        revenue: 1000,
      },
      actor,
    );

    expect(created.name).toBe('Acme');

    const updated = companiesService.update(
      created.id,
      {
        name: 'Acme Corp',
      },
      actor,
    );

    expect(updated.name).toBe('Acme Corp');
  });
});
