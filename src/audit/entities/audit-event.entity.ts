export interface AuditEventEntity {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}
