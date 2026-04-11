import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { OrganizationsController } from './organizations.controller';
import {
  OrganizationModel,
  OrganizationSchema,
} from './repositories/organization.schema';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationsService } from './organizations.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    AccessControlModule,
    DomainEventsModule,
    MongooseModule.forFeature([
      {
        name: OrganizationModel.name,
        schema: OrganizationSchema,
      },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsRepository],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
