import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DomainEventsService } from './domain-events.service';
import { OutboxProcessorService } from './outbox/outbox-processor.service';
import { OutboxEventModel, OutboxEventSchema } from './outbox/outbox.schema';
import { OutboxRepository } from './outbox/outbox.repository';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEventModel.name, schema: OutboxEventSchema },
    ]),
  ],
  providers: [OutboxRepository, DomainEventsService, OutboxProcessorService],
  exports: [DomainEventsService],
})
export class DomainEventsModule {}
