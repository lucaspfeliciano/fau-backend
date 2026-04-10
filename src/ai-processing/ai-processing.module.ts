import { Module } from '@nestjs/common';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { AiProcessingController } from './ai-processing.controller';
import { AiProcessingService } from './ai-processing.service';

@Module({
  imports: [
    ,
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
  ],
  controllers: [AiProcessingController],
  providers: [AiProcessingService],
  exports: [AiProcessingService],
})
export class AiProcessingModule {}
