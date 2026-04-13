import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../common/auth/role.enum';
import { DomainEventsService } from '../common/events/domain-events.service';
import { UsersService } from '../users/users.service';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationsRepository } from './repositories/organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createForUser(
    name: string,
    userId: string,
  ): Promise<OrganizationEntity> {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      throw new BadRequestException(
        'Organization name must have at least 2 characters.',
      );
    }

    const slug = await this.generateUniqueSlug(normalizedName);

    const now = new Date().toISOString();
    const organization: OrganizationEntity = {
      id: randomUUID(),
      name: normalizedName,
      slug,
      publicPortalEnabled: false,
      publicRoadmapEnabled: false,
      publicChangelogEnabled: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    await this.organizationsRepository.insert(organization);
    await this.usersService.addMembership(userId, organization.id, Role.Admin);
    await this.usersService.setCurrentOrganization(userId, organization.id);

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

  async ensureBootstrapOrganization(
    userId: string,
    userName: string,
    preferredOrganizationName?: string,
  ): Promise<OrganizationEntity> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new BadRequestException(
        'User not found to bootstrap organization.',
      );
    }

    if (user.memberships.length > 0) {
      const context = await this.usersService.resolveUserContext(userId);
      if (!context) {
        throw new BadRequestException(
          'Could not resolve organization context.',
        );
      }

      const existingOrganization = await this.findById(context.organizationId);
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

  async getCurrentForUser(
    userId: string,
  ): Promise<{ organization: OrganizationEntity; role: Role } | null> {
    const userContext = await this.usersService.resolveUserContext(userId);

    if (!userContext) {
      return null;
    }

    const organization = await this.findById(userContext.organizationId);
    if (!organization) {
      return null;
    }

    return {
      organization,
      role: userContext.role,
    };
  }

  findById(id: string): Promise<OrganizationEntity | undefined> {
    return this.organizationsRepository.findById(id);
  }

  findBySlug(slug: string): Promise<OrganizationEntity | undefined> {
    return this.organizationsRepository.findBySlug(slug.trim().toLowerCase());
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let suffix = 2;

    while (await this.organizationsRepository.findBySlug(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugify(value: string): string {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    if (normalized.length > 0) {
      return normalized;
    }

    return `workspace-${randomUUID().slice(0, 8)}`;
  }
}
