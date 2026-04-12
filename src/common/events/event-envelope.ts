import { randomUUID } from 'crypto';

import type { DomainEvent } from './domain-event.interface';

export const DOMAIN_EVENT_VERSION = 1 as const;

export function buildEventEnvelope<TPayload extends Record<string, unknown>>(
  event: DomainEvent<TPayload>,
): DomainEvent<TPayload> {
  const eventId = event.eventId ?? randomUUID();
  const correlationId = event.correlationId ?? eventId;

  return {
    ...event,
    eventId,
    correlationId,
    version: event.version ?? DOMAIN_EVENT_VERSION,
  };
}
