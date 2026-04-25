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
      widgetApiKey: this.generateWidgetApiKey(),
      widgetEnabled: false,
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

  async getPublicSettingsBySlug(
    slug: string,
  ): Promise<OrganizationEntity | undefined> {
    const organization = await this.findBySlug(slug);

    if (!organization) {
      return undefined;
    }

    if (!organization.widgetApiKey) {
      organization.widgetApiKey = this.generateWidgetApiKey();
      organization.updatedAt = new Date().toISOString();
      await this.organizationsRepository.update(organization);
    }

    return organization;
  }

  async updatePublicSettingsBySlug(
    slug: string,
    input: {
      logoUrl?: string | null;
      subtitle?: string | null;
      widgetEnabled?: boolean;
      rotateWidgetApiKey?: boolean;
      publicPortalEnabled?: boolean;
      publicRoadmapEnabled?: boolean;
      publicChangelogEnabled?: boolean;
    },
  ): Promise<OrganizationEntity | undefined> {
    const organization = await this.findBySlug(slug);

    if (!organization) {
      return undefined;
    }

    if (input.logoUrl !== undefined) {
      organization.logoUrl = input.logoUrl || undefined;
    }

    if (input.subtitle !== undefined) {
      organization.subtitle = input.subtitle || undefined;
    }

    if (input.widgetEnabled !== undefined) {
      organization.widgetEnabled = input.widgetEnabled;
    }

    if (input.publicPortalEnabled !== undefined) {
      organization.publicPortalEnabled = input.publicPortalEnabled;
    }

    if (input.publicRoadmapEnabled !== undefined) {
      organization.publicRoadmapEnabled = input.publicRoadmapEnabled;
    }

    if (input.publicChangelogEnabled !== undefined) {
      organization.publicChangelogEnabled = input.publicChangelogEnabled;
    }

    if (input.rotateWidgetApiKey || !organization.widgetApiKey) {
      organization.widgetApiKey = this.generateWidgetApiKey();
    }

    organization.updatedAt = new Date().toISOString();
    await this.organizationsRepository.update(organization);

    return organization;
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

  private generateWidgetApiKey(): string {
    return `wk_${randomUUID().replace(/-/g, '')}`;
  }
}
