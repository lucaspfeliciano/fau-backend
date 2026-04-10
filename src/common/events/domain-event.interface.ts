export interface DomainEvent<TPayload = Record<string, unknown>> {
  name: string;
  occurredAt: string;
  actorId?: string;
  organizationId?: string;
  payload: TPayload;
}
