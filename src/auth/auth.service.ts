import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DomainEventsService } from '../common/events/domain-events.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { LoginWithGoogleInput } from './dto/login-with-google.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  loginWithGoogle(input: LoginWithGoogleInput) {
    const user = this.usersService.findOrCreateFromGoogle({
      googleId: input.googleId,
      email: input.email,
      name: input.name,
    });

    const organization = this.organizationsService.ensureBootstrapOrganization(
      user.id,
      user.name,
      input.organizationName,
    );

    const context = this.usersService.resolveUserContext(
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
    });

    this.domainEventsService.publish({
      name: 'auth.user_logged_in',
      occurredAt: new Date().toISOString(),
      actorId: user.id,
      organizationId: context.organizationId,
      payload: {
        sourceType: 'google-oauth',
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

  getMe(authenticatedUser: AuthenticatedUser) {
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
        this.organizationsService.findById(authenticatedUser.organizationId) ??
        null,
    };
  }
}
