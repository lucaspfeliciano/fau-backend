import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { DomainEventsModule } from '../common/events/domain-events.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardModel, BoardSchema } from './repositories/board.schema';
import { BoardsRepository } from './repositories/boards.repository';

@Module({
  imports: [
    AccessControlModule,
    DomainEventsModule,
    MongooseModule.forFeature([
      {
        name: BoardModel.name,
        schema: BoardSchema,
      },
    ]),
  ],
  controllers: [BoardsController],
  providers: [BoardsService, BoardsRepository],
  exports: [BoardsService],
})
export class BoardsModule {}
