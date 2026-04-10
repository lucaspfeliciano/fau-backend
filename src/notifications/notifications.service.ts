import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { DomainEvent } from '../common/events/domain-event.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CompaniesService } from '../companies/companies.service';
import { CustomersService } from '../customers/customers.service';
import { EngineeringService } from '../engineering/engineering.service';
import { ProductService } from '../product/product.service';
import { RequestsService } from '../requests/requests.service';
import type { CreateReleaseInput } from './dto/create-release.schema';
import type { NotificationPreferencesInput } from './dto/notification-preferences.schema';
import type {
  NotificationEntity,
  NotificationPreferenceEntity,
} from './entities/notification.entity';
import type { ReleaseEntity } from './entities/release.entity';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly notifications: NotificationEntity[] = [];
  private readonly releases: ReleaseEntity[] = [];
  private readonly preferences: NotificationPreferenceEntity[] = [];
  private unsubscribeHandler?: () => void;

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly requestsService: RequestsService,
    private readonly productService: ProductService,
    private readonly engineeringService: EngineeringService,
    private readonly customersService: CustomersService,
    private readonly companiesService: CompaniesService,
  ) {}

  onModuleInit() {
    this.unsubscribeHandler = this.domainEventsService.subscribe((event) =>
      this.handleDomainEvent(event),
    );
  }

  onModuleDestroy() {
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
    }
  }

  upsertPreferences(
    input: NotificationPreferencesInput,
    actor: AuthenticatedUser,
  ): NotificationPreferenceEntity {
    const preference = this.findOrCreatePreference(
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
    return preference;
  }

  getPreferences(organizationId: string) {
    return this.preferences.filter(
      (item) => item.organizationId === organizationId,
    );
  }

  listNotifications(organizationId: string) {
    return this.notifications
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createRelease(
    input: CreateReleaseInput,
    actor: AuthenticatedUser,
  ): ReleaseEntity {
    for (const featureId of input.featureIds ?? []) {
      this.productService.findFeatureById(featureId, actor.organizationId);
    }

    for (const sprintId of input.sprintIds ?? []) {
      this.engineeringService.getSprintProgress(sprintId, actor.organizationId);
    }

    const release: ReleaseEntity = {
      id: randomUUID(),
      version: input.version,
      title: input.title,
      notes: input.notes,
      featureIds: input.featureIds ?? [],
      sprintIds: input.sprintIds ?? [],
      organizationId: actor.organizationId,
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
    };

    this.releases.push(release);

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

  listReleases(organizationId: string): ReleaseEntity[] {
    return this.releases
      .filter((release) => release.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getRoadmapOverview(organizationId: string) {
    const features = this.productService.listFeatures(
      {
        page: 1,
        limit: 1000,
      },
      organizationId,
    ).items;

    const sprints = this.engineeringService.listSprints(
      {
        page: 1,
        limit: 1000,
      },
      organizationId,
    ).items;

    const requests = this.requestsService.list(
      {
        page: 1,
        limit: 1000,
        includeArchived: false,
      },
      organizationId,
    ).items;

    const tasks = this.engineeringService.listTasks(
      {
        page: 1,
        limit: 1000,
      },
      organizationId,
    ).items;

    const upcomingReleases = this.listReleases(organizationId).slice(0, 5);

    return {
      counts: {
        requests: requests.length,
        features: features.length,
        tasks: tasks.length,
        sprints: sprints.length,
        releases: upcomingReleases.length,
      },
      featureStatusBreakdown: {
        discovery: features.filter((item) => item.status === 'Discovery')
          .length,
        planned: features.filter((item) => item.status === 'Planned').length,
        inProgress: features.filter((item) => item.status === 'In Progress')
          .length,
        done: features.filter((item) => item.status === 'Done').length,
      },
      sprintStatusBreakdown: {
        planned: sprints.filter((item) => item.status === 'Planned').length,
        active: sprints.filter((item) => item.status === 'Active').length,
        completed: sprints.filter((item) => item.status === 'Completed').length,
      },
      releases: upcomingReleases,
      recentNotifications: this.listNotifications(organizationId).slice(0, 10),
    };
  }

  getRequestTraceability(requestId: string, organizationId: string) {
    const request = this.requestsService.findOneById(requestId, organizationId);

    const allFeatures = this.productService.listFeatures(
      {
        page: 1,
        limit: 1000,
      },
      organizationId,
    ).items;

    const features = allFeatures.filter((feature) =>
      feature.requestIds.includes(requestId),
    );

    const allTasks = this.engineeringService.listTasks(
      {
        page: 1,
        limit: 1000,
      },
      organizationId,
    ).items;

    const featureIds = new Set(features.map((feature) => feature.id));
    const tasks = allTasks.filter((task) => featureIds.has(task.featureId));

    const sprintIds = Array.from(
      new Set(
        tasks
          .map((task) => task.sprintId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const sprints = sprintIds.map((sprintId) =>
      this.engineeringService.getSprintProgress(sprintId, organizationId),
    );

    const releases = this.listReleases(organizationId).filter(
      (release) =>
        release.featureIds.some((featureId) => featureIds.has(featureId)) ||
        release.sprintIds.some((sprintId) => sprintIds.includes(sprintId)),
    );

    const customers = request.customerIds
      .map((id) => {
        try {
          return this.customersService.findOneById(id, organizationId);
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);

    const companies = request.companyIds
      .map((id) => {
        try {
          return this.companiesService.findOneById(id, organizationId);
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);

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

  private handleDomainEvent(event: DomainEvent): void {
    if (!event.organizationId) {
      return;
    }

    const preference = this.getEffectivePreference(event.organizationId);
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
      payload: event.payload as Record<string, unknown>,
    };

    this.notifications.push(notification);
  }

  private findOrCreatePreference(
    organizationId: string,
    teamId?: string,
  ): NotificationPreferenceEntity {
    let existing = this.preferences.find(
      (item) =>
        item.organizationId === organizationId && item.teamId === teamId,
    );

    if (existing) {
      return existing;
    }

    existing = {
      organizationId,
      teamId,
      notifyRequestStatus: true,
      notifyFeatureStatus: true,
      notifySprintStatus: true,
      notifyRelease: true,
      updatedAt: new Date().toISOString(),
    };

    this.preferences.push(existing);
    return existing;
  }

  private getEffectivePreference(
    organizationId: string,
  ): NotificationPreferenceEntity {
    const organizationPreference = this.preferences.find(
      (item) => item.organizationId === organizationId && !item.teamId,
    );

    return (
      organizationPreference ?? this.findOrCreatePreference(organizationId)
    );
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
    const payload = event.payload as Record<string, unknown>;

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
