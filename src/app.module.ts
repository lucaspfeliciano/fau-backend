import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiProcessingModule } from './ai-processing/ai-processing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CompaniesModule } from './companies/companies.module';
import { AccessControlModule } from './common/auth/access-control.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { EngineeringModule } from './engineering/engineering.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductModule } from './product/product.module';
import { PublicPortalModule } from './public-portal/public-portal.module';
import { PrioritizationModule } from './prioritization/prioritization.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { RequestsModule } from './requests/requests.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DatabaseModule.register(),
    DomainEventsModule,
    UsersModule,
    AccessControlModule,
    OrganizationsModule,
    BoardsModule,
    CompaniesModule,
    CustomersModule,
    RequestsModule,
    PublicPortalModule,
    ProductModule,
    PrioritizationModule,
    EngineeringModule,
    TeamsModule,
    AuthModule,
    AiProcessingModule,
    IntegrationsModule,
    NotificationsModule,
    RoadmapModule,
    AuditModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
