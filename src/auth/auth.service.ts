import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { DomainEventsService } from '../common/events/domain-events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { UserEntity } from '../users/entities/user.entity';
import type {
  LoginWithGoogleInput,
  LoginWithGoogleProfileInput,
} from './dto/login-with-google.schema';

type LoginSource = 'google-oauth' | 'local-password';
type RegisterWithPasswordInput = {
  email: string;
  name: string;
  password: string;
  organizationName?: string;
};
type LoginWithPasswordInput = {
  email: string;
  password: string;
};

const GoogleTokenInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  email_verified: z.union([z.literal(true), z.literal(false), z.string()]),
  aud: z.string().optional(),
  iss: z.string().optional(),
  exp: z.string().optional(),
});

type GoogleTokenInfo = z.infer<typeof GoogleTokenInfoSchema>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async registerWithPassword(input: RegisterWithPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    const passwordHash = await this.hashPassword(input.password);
    const now = new Date().toISOString();

    let user: UserEntity;

    if (existingUser) {
      if (existingUser.passwordHash) {
        throw new BadRequestException('Email already in use.');
      }

      existingUser.name = input.name.trim();
      existingUser.email = normalizedEmail;
      existingUser.passwordHash = passwordHash;

      await this.usersService.updateUser(existingUser);
      user = existingUser;
    } else {
      user = await this.usersService.createLocalAccount({
        email: normalizedEmail,
        name: input.name.trim(),
        passwordHash,
      });
    }

    const response = await this.createAuthSession(
      user,
      'local-password',
      input.organizationName,
    );

    this.domainEventsService.publish({
      name: 'auth.user_registered',
      occurredAt: now,
      actorId: user.id,
      organizationId: response.context.organizationId,
      payload: {
        sourceType: 'local-password',
      },
    });

    return response;
  }

  async loginWithPassword(input: LoginWithPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createAuthSession(user, 'local-password');
  }

  async loginWithGoogle(input: LoginWithGoogleInput) {
    const profile = await this.resolveGoogleProfile(input);

    const user = await this.usersService.findOrCreateFromGoogle({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
    });

    return this.createAuthSession(user, 'google-oauth', input.organizationName);
  }

  private async resolveGoogleProfile(input: LoginWithGoogleInput): Promise<{
    googleId: string;
    email: string;
    name: string;
  }> {
    if (this.hasGoogleProfile(input)) {
      return {
        googleId: input.googleId,
        email: input.email,
        name: input.name,
      };
    }

    const token = input.credential ?? input.idToken ?? input.googleToken;
    if (!token) {
      throw new BadRequestException('Missing Google token payload.');
    }

    let response: Response;
    try {
      response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      );
    } catch {
      throw new UnauthorizedException('Could not validate Google token.');
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const payload: GoogleTokenInfo = this.parseGoogleTokenInfo(
      await response.json(),
    );

    const audience = process.env.GOOGLE_CLIENT_ID?.trim();
    if (audience && payload.aud !== audience) {
      throw new UnauthorizedException('Google token audience mismatch.');
    }

    if (
      payload.iss &&
      payload.iss !== 'https://accounts.google.com' &&
      payload.iss !== 'accounts.google.com'
    ) {
      throw new UnauthorizedException('Invalid Google token issuer.');
    }

    if (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Google token expired.');
    }

    if (!this.isGoogleEmailVerified(payload.email_verified)) {
      throw new UnauthorizedException('Google email is not verified.');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }

  private hasGoogleProfile(
    input: LoginWithGoogleInput,
  ): input is LoginWithGoogleProfileInput {
    return (
      'googleId' in input &&
      'email' in input &&
      'name' in input &&
      typeof input.googleId === 'string' &&
      typeof input.email === 'string' &&
      typeof input.name === 'string'
    );
  }

  private parseGoogleTokenInfo(rawPayload: unknown): GoogleTokenInfo {
    const parsed = GoogleTokenInfoSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid Google token payload.');
    }

    return parsed.data;
  }

  private isGoogleEmailVerified(value: string | boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    return value.toLowerCase() === 'true';
  }

  private async createAuthSession(
    user: UserEntity,
    sourceType: LoginSource,
    preferredOrganizationName?: string,
  ) {
    const now = new Date().toISOString();

    const organization =
      await this.organizationsService.ensureBootstrapOrganization(
        user.id,
        user.name,
        preferredOrganizationName,
      );

    const context = await this.usersService.resolveUserContext(
      user.id,
      organization.id,
    );
    if (!context) {
      throw new Error(
        'Could not resolve user organization context after login.',
      );
    }

    const accessToken: string = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: context.role,
      organizationId: context.organizationId,
    });

    this.domainEventsService.publish({
      name: 'auth.user_logged_in',
      occurredAt: now,
      actorId: user.id,
      organizationId: context.organizationId,
      payload: {
        sourceType,
      },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      context: {
        organizationId: context.organizationId,
        role: context.role,
      },
    };
  }

  private hashPassword(password: string): Promise<string> {
    const saltRounds = Number(process.env.PASSWORD_SALT_ROUNDS ?? 10);
    return hash(password, saltRounds);
  }

  async getMe(authenticatedUser: AuthenticatedUser) {
    return {
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
      },
      context: {
        organizationId: authenticatedUser.organizationId,
        role: authenticatedUser.role,
      },
      organization:
        (await this.organizationsService.findById(
          authenticatedUser.organizationId,
        )) ?? null,
    };
  }
}
