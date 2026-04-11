import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { UsersModule } from '../users/users.module';
import { TeamModel, TeamSchema } from './repositories/team.schema';
import { TeamsRepository } from './repositories/teams.repository';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    AccessControlModule,
    UsersModule,
    MongooseModule.forFeature([
      {
        name: TeamModel.name,
        schema: TeamSchema,
      },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService],
})
export class TeamsModule {}
