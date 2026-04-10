import { Module } from '@nestjs/common';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { ProductModule } from '../product/product.module';
import { UsersModule } from '../users/users.module';
import { EngineeringController } from './engineering.controller';
import { EngineeringService } from './engineering.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    ProductModule,
  ],
  controllers: [EngineeringController],
  providers: [EngineeringService],
  exports: [EngineeringService],
})
export class EngineeringModule {}
