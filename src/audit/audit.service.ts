import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { DomainEvent } from '../common/events/domain-event.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateAuditEventInput } from './dto/create-audit-event.schema';
import type { AuditEventEntity } from './entities/audit-event.entity';
import { AuditEventsRepository } from './repositories/audit-events.repository';

const AUDITABLE_EVENTS = new Set([
  'user.role_changed',
  'request.status_changed',
  'request.deleted',
  'product.feature_status_changed',
  'engineering.sprint_status_changed',
  'release.created',
  'integration.config_changed',
]);

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private unsubscribeHandler?: () => void;

  constructor(
    private readonly domainEventsService: DomainEventsService,
    private readonly auditEventsRepository: AuditEventsRepository,
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

  async list(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      actorId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const result = await this.auditEventsRepository.list(
      organizationId,
      options,
    );

    return {
      items: result.items,
      total: result.total,
      page: options.page,
      limit: options.limit,
    };
  }

  async createManualEvent(
    input: CreateAuditEventInput,
    actor: AuthenticatedUser,
  ): Promise<AuditEventEntity> {
    const event: AuditEventEntity = {
      id: randomUUID(),
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: input.action,
      resourceType: input.resourceType ?? 'manual',
      resourceId: input.resourceId,
      payload: {
        description: input.description,
        severity: input.severity,
        metadata: input.metadata ?? {},
      },
      occurredAt: new Date().toISOString(),
    };

    await this.auditEventsRepository.insert(event);
    return event;
  }

  private async handleDomainEvent(event: DomainEvent): Promise<void> {
    if (!event.organizationId || !event.actorId) {
      return;
    }

    if (!AUDITABLE_EVENTS.has(event.name)) {
      return;
    }

    const payload = event.payload ?? {};

    const auditEvent: AuditEventEntity = {
      id: event.eventId ?? randomUUID(),
      organizationId: event.organizationId,
      actorId: event.actorId,
      action: event.name,
      resourceType: this.resolveResourceType(event.name),
      resourceId: this.resolveResourceId(event.name, payload),
      payload,
      occurredAt: event.occurredAt,
    };

    await this.auditEventsRepository.insert(auditEvent);
  }

  private resolveResourceType(eventName: string): string {
    const prefix = eventName.split('.')[0];
    const typeMap: Record<string, string> = {
      user: 'user',
      request: 'request',
      product: 'feature',
      engineering: 'sprint',
      release: 'release',
      integration: 'integration',
    };
    return typeMap[prefix] ?? 'unknown';
  }

  private resolveResourceId(
    eventName: string,
    payload: Record<string, unknown>,
  ): string | undefined {
    if (eventName === 'user.role_changed') {
      return payload.targetUserId as string | undefined;
    }

    const idFields = [
      'requestId',
      'featureId',
      'sprintId',
      'releaseId',
      'taskId',
    ];

    for (const field of idFields) {
      if (payload[field]) {
        return String(payload[field]);
      }
    }

    return undefined;
  }
}
