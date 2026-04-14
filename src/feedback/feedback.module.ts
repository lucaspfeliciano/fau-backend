import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongoFeedbacksRepository } from './repositories/mongo-feedbacks.repository';
import { FEEDBACKS_REPOSITORY } from './repositories/feedbacks-repository.interface';
import { FeedbackModel, FeedbackSchema } from './repositories/feedback.schema';

@Module({
  imports: [
    AccessControlModule,
    MongooseModule.forFeature([
      {
        name: FeedbackModel.name,
        schema: FeedbackSchema,
      },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    MongoFeedbacksRepository,
    {
      provide: FEEDBACKS_REPOSITORY,
      useExisting: MongoFeedbacksRepository,
    },
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
