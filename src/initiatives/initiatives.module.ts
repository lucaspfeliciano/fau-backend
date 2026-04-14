import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { RequestsModule } from '../requests/requests.module';
import { InitiativesController } from './initiatives.controller';
import { InitiativesService } from './initiatives.service';
import {
  PlanningInitiativeModel,
  PlanningInitiativeSchema,
} from './repositories/initiative.schema';
import { PLANNING_INITIATIVES_REPOSITORY } from './repositories/initiatives-repository.interface';
import { MongoInitiativesRepository } from './repositories/mongo-initiatives.repository';

@Module({
  imports: [
    AccessControlModule,
    RequestsModule,
    MongooseModule.forFeature([
      {
        name: PlanningInitiativeModel.name,
        schema: PlanningInitiativeSchema,
      },
    ]),
  ],
  controllers: [InitiativesController],
  providers: [
    InitiativesService,
    MongoInitiativesRepository,
    {
      provide: PLANNING_INITIATIVES_REPOSITORY,
      useExisting: MongoInitiativesRepository,
    },
  ],
  exports: [InitiativesService],
})
export class InitiativesModule {}
