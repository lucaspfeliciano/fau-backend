import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { ProductModule } from '../product/product.module';
import { UsersModule } from '../users/users.module';
import { EngineeringController } from './engineering.controller';
import { SprintModel, SprintSchema } from './repositories/sprint.schema';
import { SprintsRepository } from './repositories/sprints.repository';
import { TaskModel, TaskSchema } from './repositories/task.schema';
import { TasksRepository } from './repositories/tasks.repository';
import { EngineeringService } from './engineering.service';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    UsersModule,
    ProductModule,
    MongooseModule.forFeature([
      {
        name: SprintModel.name,
        schema: SprintSchema,
      },
      {
        name: TaskModel.name,
        schema: TaskSchema,
      },
    ]),
  ],
  controllers: [EngineeringController],
  providers: [EngineeringService, SprintsRepository, TasksRepository],
  exports: [EngineeringService],
})
export class EngineeringModule {}
