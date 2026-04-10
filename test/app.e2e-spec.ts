import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Role } from '../src/common/auth/role.enum';
import { UsersService } from '../src/users/users.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;

  const loginWithGoogle = async (payload: {
    googleId: string;
    email: string;
    name: string;
  }) => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/google')
      .send(payload)
      .expect(201);

    return {
      token: loginResponse.body.accessToken as string,
      userId: loginResponse.body.user.id as string,
      organizationId: loginResponse.body.context.organizationId as string,
    };
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    usersService = moduleFixture.get<UsersService>(UsersService);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/auth/google + /auth/me (GET) should authenticate and return context', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/google')
      .send({
        googleId: 'google-user-123456',
        email: 'admin@example.com',
        name: 'Admin Example',
      })
      .expect(201);

    const token = loginResponse.body.accessToken as string;
    expect(token).toBeDefined();
    expect(loginResponse.body.context.role).toBe(Role.Admin);

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.user.email).toBe('admin@example.com');
    expect(meResponse.body.context.role).toBe(Role.Admin);
  });

  it('/auth/me (GET) should return 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/teams (POST + GET) should create and list team for Admin', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/google')
      .send({
        googleId: 'google-admin-team-123456',
        email: 'admin-team@example.com',
        name: 'Admin Team',
      })
      .expect(201);

    const token = loginResponse.body.accessToken as string;

    const createResponse = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Platform Team',
      })
      .expect(201);

    expect(createResponse.body.team.name).toBe('Platform Team');

    const listResponse = await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Platform Team' }),
      ]),
    );
  });

  it('/teams (POST) should return 403 for Viewer role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/google')
      .send({
        googleId: 'google-viewer-123456',
        email: 'viewer@example.com',
        name: 'Viewer Example',
      })
      .expect(201);

    const token = loginResponse.body.accessToken as string;
    const userId = loginResponse.body.user.id as string;
    const organizationId = loginResponse.body.context.organizationId as string;

    const roleUpdated = usersService.setMembershipRole(
      userId,
      organizationId,
      Role.Viewer,
    );
    expect(roleUpdated).toBe(true);

    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Support Team',
      })
      .expect(403);
  });

  it('/requests full flow should create, list, update, vote and soft delete', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-requests-admin-123456',
      email: 'requests-admin@example.com',
      name: 'Requests Admin',
    });

    const createResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Need dark mode',
        description: 'Multiple customers asked for dark mode.',
        tags: ['ui', 'dashboard'],
        sourceType: 'manual',
      })
      .expect(201);

    const requestId = createResponse.body.request.id as string;
    expect(createResponse.body.request.votes).toBe(1);
    expect(createResponse.body.request.status).toBe('Backlog');

    const listResponse = await request(app.getHttpServer())
      .get('/requests?page=1&limit=10&status=Backlog&search=dark')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: requestId })]),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Planned',
        tags: ['ui', 'priority-high'],
      })
      .expect(200);

    expect(updateResponse.body.request.status).toBe('Planned');

    const voteResponse = await request(app.getHttpServer())
      .post(`/requests/${requestId}/vote`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(201);

    expect(voteResponse.body.request.votes).toBe(2);

    const byIdResponse = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(byIdResponse.body.request.id).toBe(requestId);
    expect(byIdResponse.body.request.status).toBe('Planned');

    const archiveResponse = await request(app.getHttpServer())
      .delete(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(archiveResponse.body.request.deletedAt).toBeDefined();

    const defaultListAfterArchive = await request(app.getHttpServer())
      .get('/requests?page=1&limit=10')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(
      defaultListAfterArchive.body.items.some(
        (item: { id: string }) => item.id === requestId,
      ),
    ).toBe(false);

    const archivedList = await request(app.getHttpServer())
      .get('/requests?page=1&limit=10&includeArchived=true')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(
      archivedList.body.items.some(
        (item: { id: string }) => item.id === requestId,
      ),
    ).toBe(true);
  });

  it('/requests mutating routes should return 403 for Viewer role', async () => {
    const viewer = await loginWithGoogle({
      googleId: 'google-requests-viewer-123456',
      email: 'requests-viewer@example.com',
      name: 'Requests Viewer',
    });

    const seedRequest = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({
        title: 'Seed request',
        description: 'Seed item to test viewer permissions.',
      })
      .expect(201);

    const requestId = seedRequest.body.request.id as string;

    const roleUpdated = usersService.setMembershipRole(
      viewer.userId,
      viewer.organizationId,
      Role.Viewer,
    );
    expect(roleUpdated).toBe(true);

    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({
        title: 'Forbidden create',
        description: 'Viewer should not create requests.',
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({
        status: 'Planned',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/requests/${requestId}/vote`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .expect(403);
  });

  it('/companies + /customers should create and update resources', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-customer-company-admin-123456',
      email: 'customer-company-admin@example.com',
      name: 'Customer Company Admin',
    });

    const companyResponse = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Acme Corp',
        revenue: 250000,
      })
      .expect(201);

    const companyId = companyResponse.body.company.id as string;

    const customerResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Alice Johnson',
        email: 'alice@acme.com',
        companyId,
      })
      .expect(201);

    const customerId = customerResponse.body.customer.id as string;
    expect(customerResponse.body.customer.companyId).toBe(companyId);

    const customersList = await request(app.getHttpServer())
      .get(`/customers?page=1&limit=10&companyId=${companyId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(customersList.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: customerId, companyId }),
      ]),
    );

    const updatedCustomer = await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Alice Silva',
      })
      .expect(200);

    expect(updatedCustomer.body.customer.name).toBe('Alice Silva');

    const updatedCompany = await request(app.getHttpServer())
      .patch(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Acme Enterprise',
      })
      .expect(200);

    expect(updatedCompany.body.company.name).toBe('Acme Enterprise');
  });

  it('/requests link endpoints should connect customer/company and block cross-tenant links', async () => {
    const adminA = await loginWithGoogle({
      googleId: 'google-org-a-admin-123456',
      email: 'org-a-admin@example.com',
      name: 'Org A Admin',
    });

    const requestResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        title: 'Need integrations',
        description: 'Customer requested integration improvements.',
      })
      .expect(201);

    const requestId = requestResponse.body.request.id as string;

    const companyAResponse = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        name: 'Org A Company',
      })
      .expect(201);

    const companyAId = companyAResponse.body.company.id as string;

    const customerAResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        name: 'Org A Customer',
        email: 'orga-customer@example.com',
        companyId: companyAId,
      })
      .expect(201);

    const customerAId = customerAResponse.body.customer.id as string;

    const linkedCustomer = await request(app.getHttpServer())
      .post(`/requests/${requestId}/customers/${customerAId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(201);

    expect(linkedCustomer.body.request.customerIds).toContain(customerAId);

    const linkedCompany = await request(app.getHttpServer())
      .post(`/requests/${requestId}/companies/${companyAId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(201);

    expect(linkedCompany.body.request.companyIds).toContain(companyAId);

    const adminB = await loginWithGoogle({
      googleId: 'google-org-b-admin-123456',
      email: 'org-b-admin@example.com',
      name: 'Org B Admin',
    });

    const companyBResponse = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${adminB.token}`)
      .send({
        name: 'Org B Company',
      })
      .expect(201);

    const companyBId = companyBResponse.body.company.id as string;

    await request(app.getHttpServer())
      .post(`/requests/${requestId}/companies/${companyBId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(404);

    const unlinkedCustomer = await request(app.getHttpServer())
      .delete(`/requests/${requestId}/customers/${customerAId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(200);

    expect(unlinkedCustomer.body.request.customerIds).not.toContain(
      customerAId,
    );

    const unlinkedCompany = await request(app.getHttpServer())
      .delete(`/requests/${requestId}/companies/${companyAId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(200);

    expect(unlinkedCompany.body.request.companyIds).not.toContain(companyAId);
  });

  it('/product flow should create initiative/feature, link request and expose traceability', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-product-admin-123456',
      email: 'product-admin@example.com',
      name: 'Product Admin',
    });

    const companyResponse = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Roadmap Company',
      })
      .expect(201);

    const companyId = companyResponse.body.company.id as string;

    const customerResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Roadmap Customer',
        email: 'roadmap-customer@example.com',
        companyId,
      })
      .expect(201);

    const customerId = customerResponse.body.customer.id as string;

    const requestResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Need enterprise Slack workflow',
        description:
          'Enterprise customers need better Slack notification workflows.',
        tags: ['enterprise', 'strategic'],
        customerIds: [customerId],
        companyIds: [companyId],
      })
      .expect(201);

    const requestId = requestResponse.body.request.id as string;

    const initiativeResponse = await request(app.getHttpServer())
      .post('/product/initiatives')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Q2 Integrations',
        description: 'Strategic integrations for Q2.',
        status: 'Planned',
      })
      .expect(201);

    const initiativeId = initiativeResponse.body.initiative.id as string;

    const featureResponse = await request(app.getHttpServer())
      .post('/product/features')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Slack alerts v2',
        description: 'Configurable Slack alert templates.',
        initiativeId,
        requestIds: [requestId],
      })
      .expect(201);

    const featureId = featureResponse.body.feature.id as string;

    expect(featureResponse.body.feature.requestSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId,
          sourceType: 'manual',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .post(`/product/features/${featureId}/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(201);

    const featureUpdated = await request(app.getHttpServer())
      .patch(`/product/features/${featureId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'In Progress',
      })
      .expect(200);

    expect(featureUpdated.body.feature.status).toBe('In Progress');

    const requestAfterPropagation = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(requestAfterPropagation.body.request.status).toBe('In Progress');

    const traceabilityResponse = await request(app.getHttpServer())
      .get(`/product/features/${featureId}/traceability`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(traceabilityResponse.body.requests).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: requestId })]),
    );
    expect(traceabilityResponse.body.impactedCustomers).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: customerId })]),
    );
    expect(traceabilityResponse.body.impactedCompanies).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: companyId })]),
    );
  });

  it('/engineering flow should manage tasks and sprints with feature sync', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-engineering-admin-123456',
      email: 'engineering-admin@example.com',
      name: 'Engineering Admin',
    });

    const requestResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Need API observability',
        description: 'Customers need better API observability and logs.',
        tags: ['strategic'],
      })
      .expect(201);

    const requestId = requestResponse.body.request.id as string;

    const featureResponse = await request(app.getHttpServer())
      .post('/product/features')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Observability package',
        description: 'Unified observability for API operations.',
        requestIds: [requestId],
      })
      .expect(201);

    const featureId = featureResponse.body.feature.id as string;

    const sprintResponse = await request(app.getHttpServer())
      .post('/engineering/sprints')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Sprint 31',
        startDate: '2026-04-14T00:00:00.000Z',
        endDate: '2026-04-28T00:00:00.000Z',
      })
      .expect(201);

    const sprintId = sprintResponse.body.sprint.id as string;

    const taskResponse = await request(app.getHttpServer())
      .post('/engineering/tasks')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Implement tracing middleware',
        description: 'Add correlation id and structured logs.',
        featureId,
        sprintId,
        estimate: 5,
      })
      .expect(201);

    const taskId = taskResponse.body.task.id as string;

    const taskInProgress = await request(app.getHttpServer())
      .patch(`/engineering/tasks/${taskId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'In Progress',
      })
      .expect(200);

    expect(taskInProgress.body.task.status).toBe('In Progress');

    const featureAfterTaskStart = await request(app.getHttpServer())
      .get('/product/features?page=1&limit=10')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const syncedFeature = (
      featureAfterTaskStart.body.items as Array<{
        id: string;
        status: string;
      }>
    ).find((item) => item.id === featureId);
    expect(syncedFeature?.status).toBe('In Progress');

    await request(app.getHttpServer())
      .patch(`/engineering/sprints/${sprintId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Completed',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/engineering/tasks/${taskId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Done',
      })
      .expect(200);

    const progress = await request(app.getHttpServer())
      .get(`/engineering/sprints/${sprintId}/progress`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(progress.body.totals.doneTasks).toBe(1);
    expect(progress.body.totals.completionRate).toBe(100);

    const traceability = await request(app.getHttpServer())
      .get(`/engineering/tasks/${taskId}/traceability`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(traceability.body.task.id).toBe(taskId);
    expect(traceability.body.traceability.requests).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: requestId })]),
    );

    await request(app.getHttpServer())
      .patch(`/engineering/sprints/${sprintId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Completed',
      })
      .expect(200);
  });

  it('/ai/requests/import-notes should deduplicate and create requests from unstructured notes', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-ai-admin-123456',
      email: 'ai-admin@example.com',
      name: 'AI Admin',
    });

    const seed = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Dashboard por equipe',
        description: 'Clientes pedem dashboard por equipe com filtros.',
      })
      .expect(201);

    const seedRequestId = seed.body.request.id as string;

    const dedupeResponse = await request(app.getHttpServer())
      .post('/ai/requests/import-notes')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        sourceType: 'meeting-notes',
        noteExternalId: 'meeting-001',
        text: 'Cliente pediu dashboard por equipe com filtros e também relatou dificuldade em montar visões por time.',
      })
      .expect(201);

    expect(dedupeResponse.body.deduplicatedRequests).toBeGreaterThanOrEqual(1);

    const seedAfterDedupe = await request(app.getHttpServer())
      .get(`/requests/${seedRequestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(seedAfterDedupe.body.request.votes).toBeGreaterThanOrEqual(2);

    const createResponse = await request(app.getHttpServer())
      .post('/ai/requests/import-notes')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        sourceType: 'sales-conversation',
        noteExternalId: 'sales-001',
        text: 'Cliente enterprise reportou bug crítico: timeout no export CSV do relatório financeiro para auditoria.',
      })
      .expect(201);

    expect(createResponse.body.createdRequests).toBeGreaterThanOrEqual(1);

    const aiCreated = (
      createResponse.body.items as Array<{
        action: string;
        request: { sourceType: string; sourceRef?: string };
      }>
    ).find((item) => item.action === 'created');

    expect(aiCreated?.request.sourceType).toBe('ai-import');
    expect(aiCreated?.request.sourceRef).toContain('sales-conversation');
  });

  it('/integrations flow should configure providers, sync data and process webhooks', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-integrations-admin-123456',
      email: 'integrations-admin@example.com',
      name: 'Integrations Admin',
    });

    const requestResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Need analytics export',
        description: 'Customers request export for analytics data.',
      })
      .expect(201);

    const requestId = requestResponse.body.request.id as string;

    const featureResponse = await request(app.getHttpServer())
      .post('/product/features')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Analytics export',
        description: 'Deliver analytics export workflow.',
        requestIds: [requestId],
      })
      .expect(201);

    const featureId = featureResponse.body.feature.id as string;

    const taskResponse = await request(app.getHttpServer())
      .post('/engineering/tasks')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Implement export worker',
        description: 'Build export worker process.',
        featureId,
      })
      .expect(201);

    const taskId = taskResponse.body.task.id as string;

    await request(app.getHttpServer())
      .post('/integrations/slack/config')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        webhookUrl: 'https://hooks.slack.com/services/T000/B000/ok',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Planned',
      })
      .expect(200);

    const slackSync = await request(app.getHttpServer())
      .post('/integrations/slack/sync-events')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({})
      .expect(201);

    expect(slackSync.body.delivered).toBeGreaterThanOrEqual(1);

    const hubspotSync = await request(app.getHttpServer())
      .post('/integrations/hubspot/sync')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        companies: [
          {
            externalCompanyId: 'hs-company-1',
            name: 'Acme HubSpot',
            revenue: 700000,
          },
        ],
        customers: [
          {
            externalCustomerId: 'hs-contact-1',
            name: 'Alice HubSpot',
            email: 'alice.hubspot@example.com',
            externalCompanyId: 'hs-company-1',
          },
        ],
      })
      .expect(201);

    expect(hubspotSync.body.companiesSynced).toBe(1);
    expect(hubspotSync.body.customersSynced).toBe(1);

    const linearSync = await request(app.getHttpServer())
      .post('/integrations/linear/sync')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        taskIds: [taskId],
      })
      .expect(201);

    expect(linearSync.body.synced).toBe(1);

    const webhookResult = await request(app.getHttpServer())
      .post('/integrations/linear/webhook/task-status')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        externalIssueId: `linear-${taskId}`,
        status: 'Done',
      })
      .expect(201);

    expect(webhookResult.body.task.status).toBe('Done');

    const slackImport = await request(app.getHttpServer())
      .post('/integrations/slack/import-message')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        noteExternalId: 'slack-msg-01',
        text: 'Cliente pediu melhorias no dashboard de vendas e reclamou de bug no filtro de data.',
      })
      .expect(201);

    expect(slackImport.body.totalExtractedItems).toBeGreaterThanOrEqual(1);

    const status = await request(app.getHttpServer())
      .get('/integrations/status')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(status.body.slackConfigured).toBe(true);
    expect(status.body.mappingsByProvider.linear).toBeGreaterThanOrEqual(1);
  });

  it('/notifications + /releases + /roadmap should provide go-live visibility', async () => {
    const admin = await loginWithGoogle({
      googleId: 'google-notifications-admin-123456',
      email: 'notifications-admin@example.com',
      name: 'Notifications Admin',
    });

    await request(app.getHttpServer())
      .post('/notifications/preferences')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        notifyRequestStatus: true,
        notifyFeatureStatus: true,
        notifySprintStatus: true,
        notifyRelease: true,
      })
      .expect(201);

    const requestResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Need launch readiness dashboard',
        description: 'Leadership wants launch readiness dashboard for go-live.',
      })
      .expect(201);

    const requestId = requestResponse.body.request.id as string;

    await request(app.getHttpServer())
      .patch(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'Planned' })
      .expect(200);

    const featureResponse = await request(app.getHttpServer())
      .post('/product/features')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Launch readiness center',
        description: 'Delivery cockpit with launch indicators.',
        requestIds: [requestId],
      })
      .expect(201);

    const featureId = featureResponse.body.feature.id as string;

    await request(app.getHttpServer())
      .patch(`/product/features/${featureId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'In Progress' })
      .expect(200);

    const sprintResponse = await request(app.getHttpServer())
      .post('/engineering/sprints')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Sprint Launch',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-14T00:00:00.000Z',
      })
      .expect(201);

    const sprintId = sprintResponse.body.sprint.id as string;

    const taskResponse = await request(app.getHttpServer())
      .post('/engineering/tasks')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        title: 'Implement release checklist',
        description: 'Build release checklist workflow.',
        featureId,
        sprintId,
      })
      .expect(201);

    const taskId = taskResponse.body.task.id as string;

    await request(app.getHttpServer())
      .patch(`/engineering/sprints/${sprintId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'Active' })
      .expect(200);

    const releaseResponse = await request(app.getHttpServer())
      .post('/releases')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        version: 'v1.0.0',
        title: 'Launch Release',
        notes: 'Production release for v1 go-live.',
        featureIds: [featureId],
        sprintIds: [sprintId],
      })
      .expect(201);

    const releaseId = releaseResponse.body.id as string;
    expect(releaseResponse.body.version).toBe('v1.0.0');

    const releases = await request(app.getHttpServer())
      .get('/releases')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(releases.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: releaseId, version: 'v1.0.0' }),
      ]),
    );

    const notifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(notifications.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventName: 'request.status_changed' }),
        expect.objectContaining({
          eventName: 'product.feature_status_changed',
        }),
        expect.objectContaining({
          eventName: 'engineering.sprint_status_changed',
        }),
        expect.objectContaining({ eventName: 'release.created' }),
      ]),
    );

    const requestUpdates = await request(app.getHttpServer())
      .get(`/requests/${requestId}/updates`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(requestUpdates.body.request.id).toBe(requestId);
    expect(requestUpdates.body.updates.length).toBeGreaterThan(0);

    const roadmap = await request(app.getHttpServer())
      .get('/roadmap/overview')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(roadmap.body.counts.releases).toBeGreaterThanOrEqual(1);
    expect(roadmap.body.recentNotifications.length).toBeGreaterThanOrEqual(1);

    const traceability = await request(app.getHttpServer())
      .get(`/roadmap/traceability/requests/${requestId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(traceability.body.request.id).toBe(requestId);
    expect(traceability.body.features).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: featureId })]),
    );
    expect(traceability.body.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskId })]),
    );
    expect(traceability.body.sprints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sprint: expect.objectContaining({ id: sprintId }),
        }),
      ]),
    );
    expect(traceability.body.releases).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: releaseId })]),
    );
  });
});
