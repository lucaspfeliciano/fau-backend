import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findOrCreateFromGoogle' | 'resolveUserContext'>
  >;
  let organizationsService: jest.Mocked<
    Pick<OrganizationsService, 'ensureBootstrapOrganization'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let domainEventsService: jest.Mocked<Pick<DomainEventsService, 'publish'>>;

  beforeEach(async () => {
    usersService = {
      findOrCreateFromGoogle: jest.fn(async (input) => ({
        id: 'user-1',
        email: input.email,
        name: input.name,
        googleId: input.googleId,
        memberships: [
          {
            organizationId: 'org-1',
            role: Role.Admin,
            teamIds: [],
            joinedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        currentOrganizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      resolveUserContext: jest.fn(async () => ({
        organizationId: 'org-1',
        role: Role.Admin,
      })),
    };

    organizationsService = {
      ensureBootstrapOrganization: jest.fn(async () => ({
        id: 'org-1',
      })),
    };

    jwtService = {
      sign: jest.fn(() => 'jwt-token'),
    };

    domainEventsService = {
      publish: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: OrganizationsService,
          useValue: organizationsService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: DomainEventsService,
          useValue: domainEventsService,
        },
      ],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  it('should create a user context and token on Google login', async () => {
    const response = await authService.loginWithGoogle({
      googleId: 'google-auth-spec-123456',
      email: 'spec@example.com',
      name: 'Spec User',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.user.email).toBe('spec@example.com');
    expect(response.context.organizationId).toBe('org-1');
    expect(response.context.role).toBe('Admin');

    expect(usersService.findOrCreateFromGoogle).toHaveBeenCalledWith({
      googleId: 'google-auth-spec-123456',
      email: 'spec@example.com',
      name: 'Spec User',
    });
    expect(organizationsService.ensureBootstrapOrganization).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalled();
    expect(domainEventsService.publish).toHaveBeenCalled();
  });
});
