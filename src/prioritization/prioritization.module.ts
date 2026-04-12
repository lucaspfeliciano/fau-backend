import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { FeatureModel, FeatureSchema } from '../product/repositories/feature.schema';
import { FeaturesRepository } from '../product/repositories/features.repository';
import { RequestsModule } from '../requests/requests.module';
import {
  PrioritizationWeightsModel,
  PrioritizationWeightsSchema,
} from './repositories/prioritization-weights.schema';
import { PrioritizationWeightsRepository } from './repositories/prioritization-weights.repository';
import { PrioritizationController } from './prioritization.controller';
import { PrioritizationRecalcSubscriber } from './prioritization-recalc.subscriber';
import { PrioritizationService } from './prioritization.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
    CompaniesModule,
    MongooseModule.forFeature([
      {
        name: PrioritizationWeightsModel.name,
        schema: PrioritizationWeightsSchema,
      },
      {
        name: FeatureModel.name,
        schema: FeatureSchema,
      },
    ]),
  ],
  controllers: [PrioritizationController],
  providers: [
    PrioritizationWeightsRepository,
    FeaturesRepository,
    PrioritizationService,
    PrioritizationRecalcSubscriber,
  ],
  exports: [PrioritizationService],
})
export class PrioritizationModule {}
