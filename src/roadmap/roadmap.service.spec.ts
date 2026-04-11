import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainEventsService } from '../common/events/domain-events.service';
import { Role } from '../common/auth/role.enum';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { EngineeringService } from '../engineering/engineering.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import { RoadmapItemCategory } from './entities/roadmap-item.entity';
import {
  RoadmapSortBy,
  RoadmapSortOrder,
  RoadmapViewVisibility,
  type RoadmapViewEntity,
} from './entities/roadmap-view.entity';
import { RoadmapViewsRepository } from './repositories/roadmap-views.repository';
import { RoadmapService } from './roadmap.service';

describe('RoadmapService', () => {
  let roadmapService: RoadmapService;

  const actor: AuthenticatedUser = {
    id: 'user-editor-1',
    email: 'editor@example.com',
    name: 'Editor',
    organizationId: 'org-1',
    role: Role.Editor,
  };

  const viewer: AuthenticatedUser = {
    id: 'user-viewer-1',
    email: 'viewer@example.com',
    name: 'Viewer',
    organizationId: 'org-1',
    role: Role.Viewer,
  };

  const admin: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    organizationId: 'org-1',
    role: Role.Admin,
  };

  beforeEach(async () => {
    const views = new Map<string, RoadmapViewEntity>();

    const roadmapViewsRepositoryMock: Pick<
      RoadmapViewsRepository,
      'insert' | 'update' | 'deleteById' | 'findById' | 'listByOrganization'
    > = {
      async insert(view) {
        views.set(view.id, view);
      },

      async update(view) {
        views.set(view.id, view);
      },

      async deleteById(id) {
        views.delete(id);
      },

      async findById(id, organizationId) {
        const view = views.get(id);

        if (!view || view.organizationId !== organizationId) {
          return undefined;
        }

        return view;
      },

      async listByOrganization(organizationId) {
        return [...views.values()].filter(
          (view) => view.organizationId === organizationId,
        );
      },
    };

    const requestsServiceMock: Pick<RequestsService, 'list'> = {
      async list() {
        return {
          items: [
            {
              id: 'request-1',
              title: 'Improve invoices',
              description: 'Add recurring invoices.',
              boardId: 'board-finance',
              status: 'Backlog',
              votes: 6,
              tags: ['finance'],
              createdBy: 'user-editor-1',
              organizationId: 'org-1',
              customerIds: [],
              companyIds: [],
              sourceType: 'manual',
              sourceRef: undefined,
              ingestedAt: undefined,
              statusHistory: [],
              createdAt: '2026-04-01T10:00:00.000Z',
              updatedAt: '2026-04-01T12:00:00.000Z',
              deletedAt: undefined,
            },
          ],
          page: 1,
          limit: 1000,
          total: 1,
          totalPages: 1,
        };
      },
    };

    const productServiceMock: Pick<ProductService, 'listFeatures'> = {
      async listFeatures() {
        return {
          items: [
            {
              id: 'feature-1',
              title: 'Invoice automation',
              description: 'Automate billing flow.',
              status: 'Planned',
              priority: 'High',
              priorityScore: 88,
              isPriorityManual: false,
              organizationId: 'org-1',
              createdBy: 'user-editor-1',
              initiativeId: undefined,
              requestIds: ['request-1'],
              requestSources: [],
              statusHistory: [],
              createdAt: '2026-04-02T10:00:00.000Z',
              updatedAt: '2026-04-02T12:00:00.000Z',
            },
          ],
          page: 1,
          limit: 1000,
          total: 1,
          totalPages: 1,
        };
      },
    };

    const engineeringServiceMock: Pick<
      EngineeringService,
      'listTasks' | 'listSprints'
    > = {
      async listTasks() {
        return {
          items: [
            {
              id: 'task-1',
              title: 'Implement scheduler',
              description: 'Build recurring invoice scheduler.',
              featureId: 'feature-1',
              sprintId: 'sprint-1',
              status: 'Todo',
              estimate: 13,
              requestSources: [],
              organizationId: 'org-1',
              createdBy: 'user-editor-1',
              statusHistory: [],
              createdAt: '2026-04-03T10:00:00.000Z',
              updatedAt: '2026-04-03T12:00:00.000Z',
            },
          ],
          page: 1,
          limit: 1000,
          total: 1,
          totalPages: 1,
        };
      },

      async listSprints() {
        return {
          items: [
            {
              id: 'sprint-1',
              name: 'Sprint 10',
              startDate: '2026-04-04T00:00:00.000Z',
              endDate: '2026-04-18T00:00:00.000Z',
              status: 'Active',
              closeReason: undefined,
              organizationId: 'org-1',
              createdBy: 'user-editor-1',
              statusHistory: [],
              createdAt: '2026-04-04T10:00:00.000Z',
              updatedAt: '2026-04-04T12:00:00.000Z',
            },
          ],
          page: 1,
          limit: 1000,
          total: 1,
          totalPages: 1,
        };
      },
    };

    const notificationsServiceMock: Pick<NotificationsService, 'listReleases'> =
      {
        async listReleases() {
          return [
            {
              id: 'release-1',
              version: 'v1.2.0',
              title: 'Spring release',
              notes: 'Finance module improvements.',
              featureIds: ['feature-1'],
              sprintIds: ['sprint-1'],
              organizationId: 'org-1',
              createdBy: 'user-admin-1',
              createdAt: '2026-04-05T10:00:00.000Z',
            },
          ];
        },
      };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadmapService,
        DomainEventsService,
        {
          provide: RoadmapViewsRepository,
          useValue: roadmapViewsRepositoryMock,
        },
        {
          provide: RequestsService,
          useValue: requestsServiceMock,
        },
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
        {
          provide: EngineeringService,
          useValue: engineeringServiceMock,
        },
        {
          provide: NotificationsService,
          useValue: notificationsServiceMock,
        },
      ],
    }).compile();

    roadmapService = module.get<RoadmapService>(RoadmapService);
  });

  it('should list roadmap items with sorting and board filter', async () => {
    const result = await roadmapService.listItems(
      {
        page: 1,
        pageSize: 20,
        sortBy: RoadmapSortBy.Score,
        sortOrder: RoadmapSortOrder.Desc,
      },
      actor.organizationId,
    );

    expect(result.total).toBe(4);
    expect(result.items[0]?.category).toBe(RoadmapItemCategory.Feature);

    const boardFiltered = await roadmapService.listItems(
      {
        page: 1,
        pageSize: 20,
        boardId: 'board-finance',
        category: RoadmapItemCategory.Request,
        sortBy: RoadmapSortBy.Score,
        sortOrder: RoadmapSortOrder.Desc,
      },
      actor.organizationId,
    );

    expect(boardFiltered.total).toBe(1);
    expect(boardFiltered.items[0]?.category).toBe(RoadmapItemCategory.Request);
  });

  it('should create and list views by visibility', async () => {
    const privateView = await roadmapService.createView(
      {
        name: 'Minhas prioridades',
        visibility: RoadmapViewVisibility.Private,
      },
      actor,
    );

    const orgView = await roadmapService.createView(
      {
        name: 'Visao semanal do time',
        visibility: RoadmapViewVisibility.Organization,
      },
      actor,
    );

    const editorList = await roadmapService.listViews(
      {
        page: 1,
        pageSize: 20,
      },
      actor,
    );

    expect(editorList.total).toBe(2);

    const viewerList = await roadmapService.listViews(
      {
        page: 1,
        pageSize: 20,
      },
      viewer,
    );

    expect(viewerList.items.some((view) => view.id === privateView.id)).toBe(
      false,
    );
    expect(viewerList.items.some((view) => view.id === orgView.id)).toBe(true);
  });

  it('should enforce visibility and mutation permissions', async () => {
    await expect(
      roadmapService.createView(
        {
          name: 'Global roadmap',
          visibility: RoadmapViewVisibility.Organization,
        },
        viewer,
      ),
    ).rejects.toThrow(ForbiddenException);

    const privateView = await roadmapService.createView(
      {
        name: 'Owner only',
        visibility: RoadmapViewVisibility.Private,
      },
      actor,
    );

    await expect(
      roadmapService.updateView(
        privateView.id,
        {
          name: 'Nao permitido',
        },
        viewer,
      ),
    ).rejects.toThrow(ForbiddenException);

    const updatedByOwner = await roadmapService.updateView(
      privateView.id,
      {
        name: 'Owner updated',
      },
      actor,
    );

    expect(updatedByOwner.name).toBe('Owner updated');

    await roadmapService.deleteView(privateView.id, admin);

    const remaining = await roadmapService.listViews(
      {
        page: 1,
        pageSize: 20,
      },
      actor,
    );

    expect(remaining.total).toBe(0);
  });
});
