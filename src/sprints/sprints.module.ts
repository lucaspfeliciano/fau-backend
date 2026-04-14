import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { InitiativesModule } from '../initiatives/initiatives.module';
import {
  PlanningSprintModel,
  PlanningSprintSchema,
} from './repositories/sprint.schema';
import { PLANNING_SPRINTS_REPOSITORY } from './repositories/sprints-repository.interface';
import { MongoSprintsRepository } from './repositories/mongo-sprints.repository';
import { SprintsController } from './sprints.controller';
import { SprintsService } from './sprints.service';

@Module({
  imports: [
    AccessControlModule,
    InitiativesModule,
    MongooseModule.forFeature([
      {
        name: PlanningSprintModel.name,
        schema: PlanningSprintSchema,
      },
    ]),
  ],
  controllers: [SprintsController],
  providers: [
    SprintsService,
    MongoSprintsRepository,
    {
      provide: PLANNING_SPRINTS_REPOSITORY,
      useExisting: MongoSprintsRepository,
    },
  ],
  exports: [SprintsService],
})
export class SprintsModule {}
