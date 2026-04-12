import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DomainEventsService } from '../domain-events.service';

const BATCH = 50;
const POLL_MS = 5000;
/** Pending rows newer than this are assumed to be handled by the synchronous publish path */
const STALE_PENDING_MS = 5000;

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly domainEvents: DomainEventsService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.domainEvents.processOutboxBatch(BATCH, STALE_PENDING_MS);
    } catch (error) {
      this.logger.warn(
        `Outbox tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
