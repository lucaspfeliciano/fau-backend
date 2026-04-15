import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CustomersModule } from '../customers/customers.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { UsersModule } from '../users/users.module';
import { HubSpotConnector } from './connectors/hubspot.connector';
import { LinearConnector } from './connectors/linear.connector';
import { SlackConnector } from './connectors/slack.connector';
import { FirefliesConnector } from './connectors/fireflies.connector';
import { IntegrationsController } from './integrations.controller';
import { IntegrationCursorsRepository } from './repositories/integration-cursors.repository';
import {
  IntegrationCursorModel,
  IntegrationCursorSchema,
} from './repositories/integration-cursor.schema';
import { IntegrationConfigsRepository } from './repositories/integration-configs.repository';
import {
  IntegrationConfigModel,
  IntegrationConfigSchema,
} from './repositories/integration-config.schema';
import { IntegrationMetricsRepository } from './repositories/integration-metrics.repository';
import {
  IntegrationMetricModel,
  IntegrationMetricSchema,
} from './repositories/integration-metric.schema';
import { ExternalMappingsRepository } from './repositories/external-mappings.repository';
import {
  ExternalMappingModel,
  ExternalMappingSchema,
} from './repositories/external-mapping.schema';
import { StatusMappingsRepository } from './repositories/status-mappings.repository';
import {
  StatusMappingModel,
  StatusMappingSchema,
} from './repositories/status-mapping.schema';
import { IntegrationLogsRepository } from './repositories/integration-logs.repository';
import {
  IntegrationLogModel,
  IntegrationLogSchema,
} from './repositories/integration-log.schema';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    EngineeringModule,
    FeedbackModule,
    MongooseModule.forFeature([
      {
        name: IntegrationConfigModel.name,
        schema: IntegrationConfigSchema,
      },
      {
        name: ExternalMappingModel.name,
        schema: ExternalMappingSchema,
      },
      {
        name: IntegrationMetricModel.name,
        schema: IntegrationMetricSchema,
      },
      {
        name: IntegrationCursorModel.name,
        schema: IntegrationCursorSchema,
      },
      {
        name: StatusMappingModel.name,
        schema: StatusMappingSchema,
      },
      {
        name: IntegrationLogModel.name,
        schema: IntegrationLogSchema,
      },
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    FirefliesConnector,
    SlackConnector,
    HubSpotConnector,
    LinearConnector,
    IntegrationConfigsRepository,
    ExternalMappingsRepository,
    IntegrationMetricsRepository,
    IntegrationCursorsRepository,
    StatusMappingsRepository,
    IntegrationLogsRepository,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
