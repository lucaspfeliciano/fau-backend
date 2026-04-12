import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import {
  HealthEventModel,
  HealthEventSchema,
} from './repositories/health-event.schema';
import { HealthEventsRepository } from './repositories/health-events.repository';

@Module({
  imports: [
    AccessControlModule,
    MongooseModule.forFeature([
      {
        name: HealthEventModel.name,
        schema: HealthEventSchema,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService, HealthEventsRepository],
  exports: [HealthService],
})
export class HealthModule {}
