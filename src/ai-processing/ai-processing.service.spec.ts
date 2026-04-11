import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from '../companies/companies.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CustomersService } from '../customers/customers.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { RequestsService } from '../requests/requests.service';
import { TestingRequestsRepository } from '../requests/repositories/testing-requests.repository';
import { REQUESTS_REPOSITORY } from '../requests/repositories/requests-repository.interface';
import { AiProcessingService } from './ai-processing.service';
import { AiExtractedItemType } from './entities/ai-extracted-item-type.enum';

describe('AiProcessingService', () => {
  let aiProcessingService: AiProcessingService;
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
        AiProcessingService,
        RequestsService,
        TestingRequestsRepository,
        {
          provide: REQUESTS_REPOSITORY,
          useExisting: TestingRequestsRepository,
        },
        DomainEventsService,
        CustomersService,
        CompaniesService,
      ],
    }).compile();

    aiProcessingService = module.get<AiProcessingService>(AiProcessingService);
    requestsService = module.get<RequestsService>(RequestsService);
  });

  it('should extract and classify multiple items from notes', () => {
    const items = aiProcessingService.extractItems(
      'Cliente reportou bug no filtro. Também pediu integração com Slack para alertas.',
    );

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.some((item) => item.type === AiExtractedItemType.Bug)).toBe(
      true,
    );
    expect(
      items.some((item) => item.type === AiExtractedItemType.FeatureRequest),
    ).toBe(true);
  });

  it('should deduplicate similar item and increase votes', async () => {
    const existing = await requestsService.create(
      {
        title: 'Melhorar dashboard de equipe',
        description: 'Clientes precisam de dashboard por equipe com filtros.',
      },
      actor,
    );

    const result = await aiProcessingService.importNotes(
      {
        sourceType: 'meeting-notes',
        text: 'O cliente pediu melhorar dashboard por equipe com filtros avançados.',
      },
      actor,
    );

    expect(result.deduplicatedRequests).toBe(1);
    const updated = await requestsService.findOneById(
      existing.id,
      actor.organizationId,
    );
    expect(updated.votes).toBe(2);
  });

  it('should create a new request when similarity is low', async () => {
    await requestsService.create(
      {
        title: 'Integração com WhatsApp',
        description: 'Equipe de vendas quer integração com WhatsApp.',
      },
      actor,
    );

    const result = await aiProcessingService.importNotes(
      {
        sourceType: 'sales-conversation',
        text: 'Usuário relatou erro de timeout no export de CSV do relatório financeiro.',
      },
      actor,
    );

    expect(result.createdRequests).toBe(1);
    expect(result.items[0]?.request.sourceType).toBe('ai-import');
  });
});
