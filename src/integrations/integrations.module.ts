import { Module } from '@nestjs/common';
import { AiProcessingModule } from '../ai-processing/ai-processing.module';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CustomersModule } from '../customers/customers.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { UsersModule } from '../users/users.module';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector } from './connectors/slack.connector';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    EngineeringModule,
    AiProcessingModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    SlackConnector,
    HubSpotConnector,
    LinearConnector,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
