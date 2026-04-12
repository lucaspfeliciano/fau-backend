import { OutboxRepository } from './outbox/outbox.repository';

/** Use with `DomainEventsService` in unit tests (avoids Mongo). */
export const outboxRepositoryMockProvider = {
  provide: OutboxRepository,
  useValue: {
    insertPending: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailure: jest.fn().mockResolvedValue(undefined),
    findRetryable: jest.fn().mockResolvedValue([]),
  },
};
