import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import {
  AiReviewQueueItemModel,
  AiReviewQueueItemSchema,
} from './repositories/ai-review-queue-item.schema';
import { AiReviewQueueRepository } from './repositories/ai-review-queue.repository';
import { AiProcessingController } from './ai-processing.controller';
import { AiProcessingService } from './ai-processing.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
    MongooseModule.forFeature([
      {
        name: AiReviewQueueItemModel.name,
        schema: AiReviewQueueItemSchema,
      },
    ]),
  ],
  controllers: [AiProcessingController],
  providers: [AiProcessingService, AiReviewQueueRepository],
  exports: [AiProcessingService],
})
export class AiProcessingModule {}
