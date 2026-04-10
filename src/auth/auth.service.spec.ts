import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  it('should create a user context and token on Google login', () => {
    const response = authService.loginWithGoogle({
      googleId: 'google-auth-spec-123456',
      email: 'spec@example.com',
      name: 'Spec User',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.user.email).toBe('spec@example.com');
    expect(response.context.organizationId).toBeDefined();
    expect(response.context.role).toBe('Admin');
  });
});
