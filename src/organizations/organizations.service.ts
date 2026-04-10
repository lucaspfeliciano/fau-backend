import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { UsersService } from '../users/users.service';
import { OrganizationEntity } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  private readonly organizations: OrganizationEntity[] = [];

  constructor(
    private readonly usersService: UsersService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  createForUser(name: string, userId: string): OrganizationEntity {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      throw new BadRequestException(
        'Organization name must have at least 2 characters.',
      );
    }

    const now = new Date().toISOString();
    const organization: OrganizationEntity = {
      id: randomUUID(),
      name: normalizedName,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    this.organizations.push(organization);
    this.usersService.addMembership(userId, organization.id, Role.Admin);
    this.usersService.setCurrentOrganization(userId, organization.id);

    this.domainEventsService.publish({
      name: 'organization.created',
      occurredAt: now,
      actorId: userId,
      organizationId: organization.id,
      payload: {
        organizationId: organization.id,
        name: organization.name,
      },
    });

    return organization;
  }

  ensureBootstrapOrganization(
    userId: string,
    userName: string,
    preferredOrganizationName?: string,
  ): OrganizationEntity {
    const user = this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException(
        'User not found to bootstrap organization.',
      );
    }

    if (user.memberships.length > 0) {
      const context = this.usersService.resolveUserContext(userId);
      if (!context) {
        throw new BadRequestException(
          'Could not resolve organization context.',
        );
      }

      const existingOrganization = this.findById(context.organizationId);
      if (!existingOrganization) {
        throw new BadRequestException('Current organization was not found.');
      }

      return existingOrganization;
    }

    const fallbackOrganizationName =
      preferredOrganizationName?.trim() ||
      `${userName.split(' ')[0]} Organization`;

    return this.createForUser(fallbackOrganizationName, userId);
  }

  getCurrentForUser(
    userId: string,
  ): { organization: OrganizationEntity; role: Role } | null {
    const userContext = this.usersService.resolveUserContext(userId);

    if (!userContext) {
      return null;
    }

    const organization = this.findById(userContext.organizationId);
    if (!organization) {
      return null;
    }

    return {
      organization,
      role: userContext.role,
    };
  }

  findById(id: string): OrganizationEntity | undefined {
    return this.organizations.find((organization) => organization.id === id);
  }
}
