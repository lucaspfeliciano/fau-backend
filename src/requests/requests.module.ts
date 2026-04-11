import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { RequestsController } from './requests.controller';
import { MongoRequestsRepository } from './repositories/mongo-requests.repository';
import { RequestModel, RequestSchema } from './repositories/request.schema';
import { REQUESTS_REPOSITORY } from './repositories/requests-repository.interface';
import { RequestsService } from './requests.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    CustomersModule,
    CompaniesModule,
    MongooseModule.forFeature([
      {
        name: RequestModel.name,
        schema: RequestSchema,
      },
    ]),
  ],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    MongoRequestsRepository,
    {
      provide: REQUESTS_REPOSITORY,
      useExisting: MongoRequestsRepository,
    },
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
