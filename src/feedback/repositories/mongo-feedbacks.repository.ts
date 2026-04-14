import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { FeedbackEntity } from '../entities/feedback.entity';
import type { FeedbacksRepository } from './feedbacks-repository.interface';
import { FeedbackModel } from './feedback.schema';

@Injectable()
export class MongoFeedbacksRepository implements FeedbacksRepository {
  constructor(
    @InjectModel(FeedbackModel.name)
    private readonly feedbackModel: Model<FeedbackModel>,
  ) {}

  async insert(feedback: FeedbackEntity): Promise<void> {
    await this.feedbackModel.create(feedback);
  }

  async listByWorkspace(workspaceId: string): Promise<FeedbackEntity[]> {
    return this.feedbackModel
      .find({ workspaceId })
      .sort({ createdAt: -1 })
      .select({ _id: 0 })
      .lean<FeedbackEntity[]>()
      .exec();
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      source?: string;
      customerId?: string;
      search?: string;
    },
  ): Promise<{ items: FeedbackEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      workspaceId,
    };

    if (options.source) {
      filter.source = options.source;
    }

    if (options.customerId) {
      filter.customerId = options.customerId;
    }

    if (options.search) {
      const escaped = this.escapeRegex(options.search);
      const searchRegex = {
        $regex: escaped,
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.feedbackModel.countDocuments(filter).exec();
    const items = await this.feedbackModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<FeedbackEntity[]>()
      .exec();

    return {
      items,
      total,
    };
  }

  async findByIds(
    ids: string[],
    workspaceId: string,
  ): Promise<FeedbackEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.feedbackModel
      .find({
        id: { $in: ids },
        workspaceId,
      })
      .select({ _id: 0 })
      .lean<FeedbackEntity[]>()
      .exec();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
