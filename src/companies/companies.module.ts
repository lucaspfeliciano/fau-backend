import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { UsersModule } from '../users/users.module';
import { CompaniesController } from './companies.controller';
import { CompanyModel, CompanySchema } from './repositories/company.schema';
import { CompaniesRepository } from './repositories/companies.repository';
import { CompaniesService } from './companies.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    MongooseModule.forFeature([
      {
        name: CompanyModel.name,
        schema: CompanySchema,
      },
    ]),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService],
})
export class CompaniesModule {}
