import { Test, TestingModule } from '@nestjs/testing';
import { DomainEventsService } from '../common/events/domain-events.service';
import { Role } from '../common/auth/role.enum';
import { RequestsService } from './requests.service';
import { RequestStatus } from './entities/request-status.enum';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';

describe('RequestsService', () => {
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
      providers: [RequestsService, DomainEventsService],
    }).compile();

    requestsService = module.get<RequestsService>(RequestsService);
  });

  it('should create request with initial vote and status history', () => {
    const request = requestsService.create(
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

  it('should update status and append status history', () => {
    const request = requestsService.create(
      {
        title: 'Export CSV',
        description: 'Need export CSV in reports.',
      },
      actor,
    );

    const updated = requestsService.update(
      request.id,
      { status: RequestStatus.Planned },
      actor,
    );

    expect(updated.status).toBe(RequestStatus.Planned);
    expect(updated.statusHistory).toHaveLength(2);
    expect(updated.statusHistory[1]?.from).toBe(RequestStatus.Backlog);
    expect(updated.statusHistory[1]?.to).toBe(RequestStatus.Planned);
  });

  it('should archive request and remove it from default list', () => {
    const request = requestsService.create(
      {
        title: 'Legacy cleanup',
        description: 'Cleanup old section.',
      },
      actor,
    );

    requestsService.archive(request.id, actor);

    const list = requestsService.list(
      {
        page: 1,
        limit: 20,
        includeArchived: false,
      },
      actor.organizationId,
    );

    expect(list.items).toHaveLength(0);
  });

  it('should increment votes', () => {
    const request = requestsService.create(
      {
        title: 'Improve logs',
        description: 'Need better logs for support team.',
      },
      actor,
    );

    const voted = requestsService.vote(request.id, actor);
    expect(voted.votes).toBe(2);
  });
});
