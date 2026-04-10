import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiProcessingModule } from './ai-processing/ai-processing.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { AccessControlModule } from './common/auth/access-control.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { CustomersModule } from './customers/customers.module';
import { EngineeringModule } from './engineering/engineering.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductModule } from './product/product.module';
import { RequestsModule } from './requests/requests.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DomainEventsModule,
    UsersModule,
    AccessControlModule,
    OrganizationsModule,
    CompaniesModule,
    CustomersModule,
    RequestsModule,
    ProductModule,
    EngineeringModule,
    TeamsModule,
    AuthModule,
    AiProcessingModule,
    IntegrationsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
