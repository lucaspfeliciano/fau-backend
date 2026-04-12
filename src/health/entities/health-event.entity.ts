export interface HealthEventEntity {
  id: string;
  component: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}
