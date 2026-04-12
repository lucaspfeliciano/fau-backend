import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EVENT_FAILURE_REPORTER } from '../common/events/event-failure-reporter.interface';
import { UsersModule } from '../users/users.module';
import { EventsHealthReporterService } from './events-health-reporter.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import {
  HealthEventModel,
  HealthEventSchema,
} from './repositories/health-event.schema';
import { HealthEventsRepository } from './repositories/health-events.repository';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      {
        name: HealthEventModel.name,
        schema: HealthEventSchema,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    HealthEventsRepository,
    EventsHealthReporterService,
    {
      provide: EVENT_FAILURE_REPORTER,
      useExisting: EventsHealthReporterService,
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
