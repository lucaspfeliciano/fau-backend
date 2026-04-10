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
});
