import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DomainEventsService } from '../common/events/domain-events.service';
import { outboxRepositoryMockProvider } from '../common/events/outbox-repository.mock';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { Role } from '../common/auth/role.enum';
import { RequestSourceType } from '../requests/entities/request-source-type.enum';
import { RequestsService } from '../requests/requests.service';
import type { AiReviewQueueItemEntity } from './entities/ai-review-queue-item.entity';
import { AiReviewQueueStatus } from './entities/ai-review-queue-status.enum';
import { AiReviewQueueRepository } from './repositories/ai-review-queue.repository';
import { AiProcessingService } from './ai-processing.service';

describe('AiProcessingService', () => {
  let aiProcessingService: AiProcessingService;
  let requestsService: jest.Mocked<
    Pick<
      RequestsService,
      | 'list'
      | 'findMostSimilarByText'
      | 'vote'
      | 'create'
      | 'createWithIntelligentDeduplication'
    >
  >;

  const actor: AuthenticatedUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const queueItems = new Map<string, AiReviewQueueItemEntity>();

    const requestsServiceMock: jest.Mocked<
      Pick<
        RequestsService,
        | 'list'
        | 'findMostSimilarByText'
        | 'vote'
        | 'create'
        | 'createWithIntelligentDeduplication'
      >
    > = {
      list: jest.fn(),
      findMostSimilarByText: jest.fn(),
      vote: jest.fn(),
      create: jest.fn(),
      createWithIntelligentDeduplication: jest.fn(),
    };

    const reviewQueueRepositoryMock: Pick<
      AiReviewQueueRepository,
      'insert' | 'update' | 'findById' | 'listByOrganization'
    > = {
      async insert(item) {
        queueItems.set(item.id, item);
      },
      async update(item) {
        queueItems.set(item.id, item);
      },
      async findById(id, organizationId) {
        const item = queueItems.get(id);
        if (!item || item.organizationId !== organizationId) {
          return undefined;
        }

        return item;
      },
      async listByOrganization(organizationId, status) {
        return [...queueItems.values()]
          .filter((item) => item.organizationId === organizationId)
          .filter((item) => {
            if (!status) {
              return true;
            }

            return item.status === status;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProcessingService,
        outboxRepositoryMockProvider,
        DomainEventsService,
        {
          provide: RequestsService,
          useValue: requestsServiceMock,
        },
        {
          provide: AiReviewQueueRepository,
          useValue: reviewQueueRepositoryMock,
        },
      ],
    }).compile();

    aiProcessingService = module.get<AiProcessingService>(AiProcessingService);
    requestsService = module.get(RequestsService);
  });

  it('should match similar requests with reasons', async () => {
    requestsService.list.mockResolvedValue({
      items: [
        {
          id: 'request-1',
          title: 'Dashboard por equipe',
          description: 'Adicionar filtro por squad e status no dashboard.',
          boardId: 'board-1',
          status: 'Backlog',
          votes: 3,
          tags: ['ui'],
          createdBy: 'user-1',
          organizationId: actor.organizationId,
          customerIds: [],
          companyIds: [],
          sourceType: RequestSourceType.Manual,
          statusHistory: [],
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
        },
        {
          id: 'request-2',
          title: 'Notificacoes por email',
          description: 'Enviar email quando status mudar.',
          boardId: 'board-2',
          status: 'Backlog',
          votes: 2,
          tags: ['notifications'],
          createdBy: 'user-1',
          organizationId: actor.organizationId,
          customerIds: [],
          companyIds: [],
          sourceType: RequestSourceType.Manual,
          statusHistory: [],
          createdAt: '2026-04-10T10:00:00.000Z',
          updatedAt: '2026-04-10T10:00:00.000Z',
        },
      ],
      page: 1,
      limit: 1000,
      total: 2,
      totalPages: 1,
    });

    const result = await aiProcessingService.matchSimilarRequests(
      {
        text: 'Cliente pediu dashboard por squad com filtros de equipe.',
      },
      actor,
    );

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]?.requestId).toBe('request-1');
    expect(result.matches[0]?.reason.length).toBeGreaterThan(0);
  });

  it('should register merged items when intelligent dedup returns auto-merge', async () => {
    requestsService.findMostSimilarByText.mockResolvedValue(undefined);
    requestsService.createWithIntelligentDeduplication.mockResolvedValue({
      decision: 'auto_merged',
      request: {
        id: 'request-main-1',
        title: 'Dashboard por equipe',
        description: 'Consolidated request',
        status: 'Backlog',
        votes: 5,
        tags: ['ui'],
        createdBy: actor.id,
        organizationId: actor.organizationId,
        customerIds: [],
        companyIds: [],
        sourceType: RequestSourceType.AiImport,
        statusHistory: [],
        createdAt: '2026-04-10T12:00:00.000Z',
        updatedAt: '2026-04-10T12:00:00.000Z',
      },
      mergedRequestId: 'request-dup-1',
      candidates: [
        {
          requestId: 'request-main-1',
          title: 'Dashboard por equipe',
          similarityScore: 0.84,
          actionSuggested: 'auto_merge',
        },
      ],
    });

    const result = await aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.MeetingNotes,
        text: 'Cliente precisa dashboard por equipe com filtros e relatou o mesmo pedido em reuniao anterior.',
      },
      actor,
    );

    expect(result.mergedRequests).toBe(1);
    expect(result.items[0]?.action).toBe('merged');
    expect(result.items[0]?.deduplicationDecision).toBe('auto_merged');
  });

  it('should queue low-confidence items and approve/reject decisions', async () => {
    requestsService.findMostSimilarByText.mockResolvedValue(undefined);
    requestsService.create.mockImplementation(async (input, currentActor) => ({
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'Backlog',
      votes: 1,
      tags: input.tags ?? [],
      createdBy: currentActor.id,
      organizationId: currentActor.organizationId,
      customerIds: [],
      companyIds: [],
      sourceType: input.sourceType ?? RequestSourceType.Manual,
      sourceRef: input.sourceRef,
      ingestedAt: undefined,
      statusHistory: [],
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
    }));

    const queuedImport = await aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.MeetingNotes,
        text: 'Fluxo confuso na tela inicial.',
      },
      actor,
    );

    expect(queuedImport.queuedForReviewItems).toBe(1);
    expect(queuedImport.items[0]?.action).toBe('queued');

    const pendingQueue = await aiProcessingService.listReviewQueue(
      {
        page: 1,
        limit: 20,
        status: AiReviewQueueStatus.Pending,
      },
      actor.organizationId,
    );

    expect(pendingQueue.total).toBe(1);

    const approved = await aiProcessingService.approveReviewQueueItem(
      pendingQueue.items[0].id,
      actor,
    );

    expect(approved.status).toBe(AiReviewQueueStatus.Approved);
    expect(approved.resultingRequestId).toBeDefined();

    const secondQueuedImport = await aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.SalesConversation,
        text: 'Dor no onboarding inicial.',
      },
      actor,
    );

    const rejected = await aiProcessingService.rejectReviewQueueItem(
      secondQueuedImport.items[0].queueItemId!,
      actor,
    );

    expect(rejected.status).toBe(AiReviewQueueStatus.Rejected);
  });

  it('should approve review queue in batch', async () => {
    requestsService.findMostSimilarByText.mockResolvedValue(undefined);
    requestsService.create.mockImplementation(async (input, currentActor) => ({
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: 'Backlog',
      votes: 1,
      tags: input.tags ?? [],
      createdBy: currentActor.id,
      organizationId: currentActor.organizationId,
      customerIds: [],
      companyIds: [],
      sourceType: input.sourceType ?? RequestSourceType.Manual,
      sourceRef: input.sourceRef,
      ingestedAt: undefined,
      statusHistory: [],
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
    }));

    const first = await aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.MeetingNotes,
        text: 'Fluxo confuso para equipe.',
      },
      actor,
    );

    const second = await aiProcessingService.importNotes(
      {
        sourceType: RequestSourceType.SalesConversation,
        text: 'Dor no uso do onboarding.',
      },
      actor,
    );

    const batch = await aiProcessingService.approveReviewQueueBatch(
      {
        itemIds: [first.items[0].queueItemId!, second.items[0].queueItemId!],
      },
      actor,
    );

    expect(batch.approved).toBe(2);
    const pending = await aiProcessingService.listReviewQueue(
      {
        page: 1,
        limit: 20,
        status: AiReviewQueueStatus.Pending,
      },
      actor.organizationId,
    );

    expect(pending.total).toBe(0);
    expect(requestsService.create).toHaveBeenCalledTimes(2);
  });
});
