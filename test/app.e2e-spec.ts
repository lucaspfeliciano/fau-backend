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
});
