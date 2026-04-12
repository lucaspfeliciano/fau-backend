import { Module } from '@nestjs/common';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { RequestsModule } from '../requests/requests.module';
import { ProductModule } from '../product/product.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    RequestsModule,
    ProductModule,
    EngineeringModule,
    UsersModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
