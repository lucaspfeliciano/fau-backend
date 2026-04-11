import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductModule } from '../product/product.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';
import {
  RoadmapViewModel,
  RoadmapViewSchema,
} from './repositories/roadmap-view.schema';
import { RoadmapViewsRepository } from './repositories/roadmap-views.repository';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
    ProductModule,
    EngineeringModule,
    NotificationsModule,
    MongooseModule.forFeature([
      {
        name: RoadmapViewModel.name,
        schema: RoadmapViewSchema,
      },
    ]),
  ],
  controllers: [RoadmapController],
  providers: [RoadmapService, RoadmapViewsRepository],
  exports: [RoadmapService],
})
export class RoadmapModule {}
