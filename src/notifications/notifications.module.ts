import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { ProductModule } from '../product/product.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import {
  NotificationPreferenceModel,
  NotificationPreferenceSchema,
} from './repositories/notification-preference.schema';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';
import {
  NotificationModel,
  NotificationSchema,
} from './repositories/notification.schema';
import { NotificationsRepository } from './repositories/notifications.repository';
import { ReleaseModel, ReleaseSchema } from './repositories/release.schema';
import { ReleasesRepository } from './repositories/releases.repository';
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
    MongooseModule.forFeature([
      {
        name: NotificationModel.name,
        schema: NotificationSchema,
      },
      {
        name: NotificationPreferenceModel.name,
        schema: NotificationPreferenceSchema,
      },
      {
        name: ReleaseModel.name,
        schema: ReleaseSchema,
      },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationPreferencesRepository,
    ReleasesRepository,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
