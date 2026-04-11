import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { RequestCommentEntity } from '../entities/request-comment.entity';
import type { RequestCommentsRepository } from './request-comments-repository.interface';
import { RequestCommentModel } from './request-comment.schema';

@Injectable()
export class MongoRequestCommentsRepository implements RequestCommentsRepository {
  constructor(
    @InjectModel(RequestCommentModel.name)
    private readonly requestCommentModel: Model<RequestCommentModel>,
  ) {}

  async insert(comment: RequestCommentEntity): Promise<void> {
    await this.requestCommentModel.create(comment);
  }

  async listByRequest(
    requestId: string,
    organizationId: string,
  ): Promise<RequestCommentEntity[]> {
    return this.requestCommentModel
      .find({ requestId, organizationId })
      .sort({ createdAt: 1 })
      .select({ _id: 0 })
      .lean<RequestCommentEntity[]>()
      .exec();
  }
}
