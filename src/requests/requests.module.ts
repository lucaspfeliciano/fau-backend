import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { RequestsController } from './requests.controller';
import { MongoRequestCommentsRepository } from './repositories/mongo-request-comments.repository';
import { MongoRequestsRepository } from './repositories/mongo-requests.repository';
import { REQUEST_COMMENTS_REPOSITORY } from './repositories/request-comments-repository.interface';
import {
  RequestCommentModel,
  RequestCommentSchema,
} from './repositories/request-comment.schema';
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
      {
        name: RequestCommentModel.name,
        schema: RequestCommentSchema,
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
    MongoRequestCommentsRepository,
    {
      provide: REQUEST_COMMENTS_REPOSITORY,
      useExisting: MongoRequestCommentsRepository,
    },
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
