import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { DomainEvent } from '../common/events/domain-event.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { SprintStatus } from '../engineering/entities/sprint-status.enum';
import { FeatureStatus } from '../product/entities/feature-status.enum';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import type { CreateReleaseInput } from './dto/create-release.schema';
import type { NotificationPreferencesInput } from './dto/notification-preferences.schema';
import type { UpdateReleaseInput } from './dto/update-release.schema';
import type {
  NotificationEntity,
  NotificationPreferenceEntity,
} from './entities/notification.entity';
import type { ReleaseEntity } from './entities/release.entity';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';
import { NotificationsRepository } from './repositories/notifications.repository';
import { ReleasesRepository } from './repositories/releases.repository';

interface NotificationsReadRepository {
  markAsRead(
    notificationId: string,
    organizationId: string,
    readAt: string,
  ): Promise<NotificationEntity | undefined>;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private static readonly AGGREGATION_PAGE_LIMIT = 100;
  private unsubscribeHandler?: () => void;

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly requestsService: RequestsService,
    private readonly productService: ProductService,
    private readonly engineeringService: EngineeringService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationPreferencesRepository: NotificationPreferencesRepository,
    private readonly releasesRepository: ReleasesRepository,
  ) {}

  onModuleInit() {
    this.unsubscribeHandler = this.domainEventsService.subscribe((event) => {
      void this.handleDomainEvent(event);
    });
  }

  onModuleDestroy() {
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
    }
  }

  async upsertPreferences(
    input: NotificationPreferencesInput,
    actor: AuthenticatedUser,
  ): Promise<NotificationPreferenceEntity> {
    const preference = await this.findOrCreatePreference(
      actor.organizationId,
      input.teamId,
    );

    if (input.notifyRequestStatus !== undefined) {
      preference.notifyRequestStatus = input.notifyRequestStatus;
    }

    if (input.notifyFeatureStatus !== undefined) {
      preference.notifyFeatureStatus = input.notifyFeatureStatus;
    }

    if (input.notifySprintStatus !== undefined) {
      preference.notifySprintStatus = input.notifySprintStatus;
    }

    if (input.notifyRelease !== undefined) {
      preference.notifyRelease = input.notifyRelease;
    }

    preference.updatedAt = new Date().toISOString();
    await this.notificationPreferencesRepository.upsert(preference);

    return preference;
  }

  async getPreferences(organizationId: string) {
    return this.notificationPreferencesRepository.listByOrganization(
      organizationId,
    );
  }

  async listNotifications(organizationId: string) {
    return this.notificationsRepository.listByOrganization(organizationId);
  }

  async markNotificationAsRead(
    notificationId: string,
    actor: AuthenticatedUser,
  ): Promise<NotificationEntity> {
    const readAt = new Date().toISOString();
    const readRepository = this
      .notificationsRepository as NotificationsReadRepository;
    const notification = await readRepository.markAsRead(
      notificationId,
      actor.organizationId,
      readAt,
    );

    if (!notification) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    return notification;
  }

  async createRelease(
    input: CreateReleaseInput,
    actor: AuthenticatedUser,
  ): Promise<ReleaseEntity> {
    for (const featureId of input.featureIds ?? []) {
      await this.productService.findFeatureById(
        featureId,
        actor.organizationId,
      );
    }

    for (const sprintId of input.sprintIds ?? []) {
      await this.engineeringService.getSprintProgress(
        sprintId,
        actor.organizationId,
      );
    }

    const createdAt = new Date().toISOString();
    const release: ReleaseEntity = {
      id: randomUUID(),
      version: input.version,
      title: input.title,
      notes: input.notes,
      status: 'draft',
      featureIds: input.featureIds ?? [],
      sprintIds: input.sprintIds ?? [],
      organizationId: actor.organizationId,
      createdBy: actor.id,
      createdAt,
      updatedAt: createdAt,
    };

    await this.releasesRepository.insert(release);

    this.domainEventsService.publish({
      name: 'release.created',
      occurredAt: release.createdAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        releaseId: release.id,
        version: release.version,
        featureIds: release.featureIds,
        sprintIds: release.sprintIds,
      },
    });

    return release;
  }

  async listReleases(organizationId: string): Promise<ReleaseEntity[]> {
    return this.releasesRepository.listByOrganization(organizationId);
  }

  async updateRelease(
    id: string,
    input: UpdateReleaseInput,
    actor: AuthenticatedUser,
  ): Promise<ReleaseEntity> {
    const release = await this.releasesRepository.findById(
      id,
      actor.organizationId,
    );

    if (!release) {
      throw new Error('RELEASE_NOT_FOUND');
    }

    if (input.title !== undefined) {
      release.title = input.title;
    }

    if (input.notes !== undefined) {
      release.notes = input.notes;
    }

    if (input.status !== undefined) {
      release.status = input.status;
      if (input.status !== 'scheduled' && input.scheduledAt === undefined) {
        release.scheduledAt = undefined;
      }
    }

    if (input.scheduledAt !== undefined) {
      release.scheduledAt = input.scheduledAt;
    }

    release.updatedAt = new Date().toISOString();
    await this.releasesRepository.update(release);

    this.domainEventsService.publish({
      name: 'release.updated',
      occurredAt: release.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        releaseId: release.id,
        status: release.status,
      },
    });

    return release;
  }

  async getRoadmapOverview(organizationId: string) {
    const [features, sprints, requests, tasks] = await Promise.all([
      this.collectAllFeatures(organizationId),
      this.collectAllSprints(organizationId),
      this.collectAllRequests(organizationId),
      this.collectAllTasks(organizationId),
    ]);

    const upcomingReleases = (await this.listReleases(organizationId)).slice(
      0,
      5,
    );

    return {
      counts: {
        requests: requests.length,
        features: features.length,
        tasks: tasks.length,
        sprints: sprints.length,
        releases: upcomingReleases.length,
      },
      featureStatusBreakdown: {
        discovery: features.filter(
          (item) => item.status === FeatureStatus.Discovery,
        ).length,
        planned: features.filter(
          (item) => item.status === FeatureStatus.Planned,
        ).length,
        inProgress: features.filter(
          (item) => item.status === FeatureStatus.InProgress,
        ).length,
        done: features.filter((item) => item.status === FeatureStatus.Done)
          .length,
      },
      sprintStatusBreakdown: {
        planned: sprints.filter((item) => item.status === SprintStatus.Planned)
          .length,
        active: sprints.filter((item) => item.status === SprintStatus.Active)
          .length,
        completed: sprints.filter(
          (item) => item.status === SprintStatus.Completed,
        ).length,
      },
      releases: upcomingReleases,
      recentNotifications: (await this.listNotifications(organizationId)).slice(
        0,
        10,
      ),
    };
  }

  async getRequestTraceability(requestId: string, organizationId: string) {
    const request = await this.requestsService.findOneById(
      requestId,
      organizationId,
    );

    const allFeatures = await this.collectAllFeatures(organizationId);

    const features = allFeatures.filter((feature) =>
      feature.requestIds.includes(requestId),
    );

    const allTasks = await this.collectAllTasks(organizationId);

    const featureIds = new Set(features.map((feature) => feature.id));
    const tasks = allTasks.filter((task) => featureIds.has(task.featureId));

    const sprintIds = Array.from(
      new Set(
        tasks
          .map((task) => task.sprintId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const sprints = await Promise.all(
      sprintIds.map((sprintId) =>
        this.engineeringService.getSprintProgress(sprintId, organizationId),
      ),
    );

    const releases = (await this.listReleases(organizationId)).filter(
      (release) =>
        release.featureIds.some((featureId) => featureIds.has(featureId)) ||
        release.sprintIds.some((sprintId) => sprintIds.includes(sprintId)),
    );

    const customers = (
      await Promise.all(
        request.customerIds.map(async (id) => {
          try {
            return await this.customersService.findOneById(id, organizationId);
          } catch {
            return undefined;
          }
        }),
      )
    ).filter(Boolean);

    const companies = (
      await Promise.all(
        request.companyIds.map(async (id) => {
          try {
            return await this.companiesService.findOneById(id, organizationId);
          } catch {
            return undefined;
          }
        }),
      )
    ).filter(Boolean);

    return {
      request,
      features,
      tasks,
      sprints,
      releases,
      customers,
      companies,
    };
  }

  private async handleDomainEvent(event: DomainEvent): Promise<void> {
    if (!event.organizationId) {
      return;
    }

    const preference = await this.getEffectivePreference(event.organizationId);
    const shouldNotify = this.shouldNotifyByPreference(event.name, preference);

    if (!shouldNotify) {
      return;
    }

    const notification: NotificationEntity = {
      id: randomUUID(),
      organizationId: event.organizationId,
      eventName: event.name,
      title: this.mapTitle(event.name),
      message: this.mapMessage(event),
      createdAt: event.occurredAt,
      payload: event.payload,
    };

    await this.notificationsRepository.insert(notification);
  }

  private async collectAllRequests(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.requestsService.list(
        {
          page,
          limit,
          includeArchived: false,
        },
        organizationId,
      ),
    );
  }

  private async collectAllFeatures(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.productService.listFeatures(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllTasks(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.engineeringService.listTasks(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllSprints(organizationId: string) {
    return this.collectAllPages((page, limit) =>
      this.engineeringService.listSprints(
        {
          page,
          limit,
        },
        organizationId,
      ),
    );
  }

  private async collectAllPages<T>(
    fetchPage: (
      page: number,
      limit: number,
    ) => Promise<{ items: T[]; totalPages: number }>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await fetchPage(
        page,
        NotificationsService.AGGREGATION_PAGE_LIMIT,
      );
      items.push(...result.items);

      totalPages = result.totalPages;
      if (totalPages === 0) {
        break;
      }

      page += 1;
    }

    return items;
  }

  private async findOrCreatePreference(
    organizationId: string,
    teamId?: string,
  ): Promise<NotificationPreferenceEntity> {
    const existing =
      await this.notificationPreferencesRepository.findByOrganizationAndTeam(
        organizationId,
        teamId,
      );

    if (existing) {
      return existing;
    }

    const created: NotificationPreferenceEntity = {
      organizationId,
      teamId,
      notifyRequestStatus: true,
      notifyFeatureStatus: true,
      notifySprintStatus: true,
      notifyRelease: true,
      updatedAt: new Date().toISOString(),
    };

    await this.notificationPreferencesRepository.upsert(created);
    return created;
  }

  private async getEffectivePreference(
    organizationId: string,
  ): Promise<NotificationPreferenceEntity> {
    const organizationPreference =
      await this.notificationPreferencesRepository.findByOrganizationAndTeam(
        organizationId,
      );

    if (organizationPreference) {
      return organizationPreference;
    }

    return this.findOrCreatePreference(organizationId);
  }

  private shouldNotifyByPreference(
    eventName: string,
    preference: NotificationPreferenceEntity,
  ): boolean {
    if (eventName === 'request.status_changed') {
      return preference.notifyRequestStatus;
    }

    if (eventName === 'product.feature_status_changed') {
      return preference.notifyFeatureStatus;
    }

    if (eventName === 'engineering.sprint_status_changed') {
      return preference.notifySprintStatus;
    }

    if (eventName === 'release.created') {
      return preference.notifyRelease;
    }

    return false;
  }

  private mapTitle(eventName: string): string {
    if (eventName === 'request.status_changed') {
      return 'Request status changed';
    }

    if (eventName === 'product.feature_status_changed') {
      return 'Feature status changed';
    }

    if (eventName === 'engineering.sprint_status_changed') {
      return 'Sprint status changed';
    }

    if (eventName === 'release.created') {
      return 'Release published';
    }

    return 'Domain event notification';
  }

  private mapMessage(event: DomainEvent): string {
    const payload = event.payload;

    if (event.name === 'request.status_changed') {
      return `Request ${String(payload.requestId)} moved from ${String(payload.from)} to ${String(payload.to)}.`;
    }

    if (event.name === 'product.feature_status_changed') {
      return `Feature ${String(payload.featureId)} moved from ${String(payload.from)} to ${String(payload.to)}.`;
    }

    if (event.name === 'engineering.sprint_status_changed') {
      return `Sprint ${String(payload.sprintId)} moved from ${String(payload.from)} to ${String(payload.to)}.`;
    }

    if (event.name === 'release.created') {
      return `Release ${String(payload.version)} was created.`;
    }

    return event.name;
  }
}
