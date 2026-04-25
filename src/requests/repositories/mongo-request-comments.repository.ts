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

  async countByRequestIds(
    requestIds: string[],
    organizationId: string,
  ): Promise<Map<string, number>> {
    if (requestIds.length === 0) {
      return new Map();
    }

    const results = await this.requestCommentModel
      .aggregate([
        {
          $match: {
            requestId: { $in: requestIds },
            organizationId,
          },
        },
        {
          $group: {
            _id: '$requestId',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const map = new Map<string, number>();
    for (const result of results) {
      map.set(result._id, result.count);
    }

    return map;
  }
}
