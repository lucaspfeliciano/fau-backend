export interface DomainEvent<TPayload = Record<string, unknown>> {
  name: string;
  occurredAt: string;
  actorId?: string;
  organizationId?: string;
  payload: TPayload;
  /** Stable id for deduplication and outbox replay */
  eventId?: string;
  correlationId?: string;
  version?: number;
}
