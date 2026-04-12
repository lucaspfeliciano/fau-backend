export const EVENT_FAILURE_REPORTER = 'EVENT_FAILURE_REPORTER';

export interface EventFailureIncident {
  component: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface EventFailureReporter {
  report(incident: EventFailureIncident): Promise<void>;
}
