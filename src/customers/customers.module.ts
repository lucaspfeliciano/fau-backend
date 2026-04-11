import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { UsersModule } from '../users/users.module';
import { CustomersController } from './customers.controller';
import { CustomerModel, CustomerSchema } from './repositories/customer.schema';
import { CustomersRepository } from './repositories/customers.repository';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    CompaniesModule,
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    MongooseModule.forFeature([
      {
        name: CustomerModel.name,
        schema: CustomerSchema,
      },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
