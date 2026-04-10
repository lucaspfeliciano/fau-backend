import { Module } from '@nestjs/common';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { ProductModule } from '../product/product.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
    ProductModule,
    EngineeringModule,
    CustomersModule,
    CompaniesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
