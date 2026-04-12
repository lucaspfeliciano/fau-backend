import { OutboxRepository } from './outbox/outbox.repository';

/** Use with `DomainEventsService` in unit tests (avoids Mongo). */
export const outboxRepositoryMockProvider = {
  provide: OutboxRepository,
  useValue: {
    insertPending: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailure: jest.fn().mockResolvedValue(undefined),
    findRetryable: jest.fn().mockResolvedValue([]),
    countDistinctActorsByRange: jest.fn().mockResolvedValue(0),
    listKnownEventNames: jest.fn().mockResolvedValue([]),
    getOperationalStats: jest.fn().mockResolvedValue({
      pending: 0,
      completed: 0,
      deadLetter: 0,
      retryable: 0,
      oldestPendingAt: undefined,
      oldestDeadLetterAt: undefined,
    }),
  },
};
