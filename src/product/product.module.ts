import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CustomersModule } from '../customers/customers.module';
import { RequestsModule } from '../requests/requests.module';
import { UsersModule } from '../users/users.module';
import { ProductController } from './product.controller';
import { FeatureModel, FeatureSchema } from './repositories/feature.schema';
import {
  InitiativeModel,
  InitiativeSchema,
} from './repositories/initiative.schema';
import { FeaturesRepository } from './repositories/features.repository';
import { InitiativesRepository } from './repositories/initiatives.repository';
import { ProductService } from './product.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    RequestsModule,
    CustomersModule,
    CompaniesModule,
    MongooseModule.forFeature([
      {
        name: InitiativeModel.name,
        schema: InitiativeSchema,
      },
      {
        name: FeatureModel.name,
        schema: FeatureSchema,
      },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService, InitiativesRepository, FeaturesRepository],
  exports: [ProductService],
})
export class ProductModule {}
