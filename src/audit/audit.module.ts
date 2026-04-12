import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import {
  AuditEventModel,
  AuditEventSchema,
} from './repositories/audit-event.schema';
import { AuditEventsRepository } from './repositories/audit-events.repository';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    MongooseModule.forFeature([
      {
        name: AuditEventModel.name,
        schema: AuditEventSchema,
      },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditEventsRepository],
  exports: [AuditService],
})
export class AuditModule {}
