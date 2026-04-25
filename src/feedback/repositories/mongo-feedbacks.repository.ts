import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  FeedbackComment,
  FeedbackEntity,
} from '../entities/feedback.entity';
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
      status?: string;
      sortBy?: 'recent' | 'votes';
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

    if (options.status) {
      filter.status = options.status;
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
    const sortStage: Record<string, 1 | -1> =
      options.sortBy === 'votes'
        ? { votes: -1, createdAt: -1 }
        : { createdAt: -1 };
    const items = await this.feedbackModel
      .find(filter)
      .sort(sortStage)
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

  async incrementVotes(
    feedbackId: string,
    workspaceId: string,
    fingerprint?: string,
  ): Promise<FeedbackEntity> {
    const update: Record<string, unknown> = { $inc: { votes: 1 } };
    if (fingerprint) {
      update.$addToSet = { voterIds: fingerprint };
    }
    const updated = await this.feedbackModel
      .findOneAndUpdate({ id: feedbackId, workspaceId }, update, { new: true })
      .select({ _id: 0 })
      .lean<FeedbackEntity>()
      .exec();

    if (!updated) {
      throw new Error('Feedback not found for vote increment.');
    }

    return updated;
  }

  async addComment(
    feedbackId: string,
    workspaceId: string,
    comment: FeedbackComment,
  ): Promise<FeedbackEntity> {
    const updated = await this.feedbackModel
      .findOneAndUpdate(
        { id: feedbackId, workspaceId },
        { $push: { comments: comment } },
        { new: true },
      )
      .select({ _id: 0 })
      .lean<FeedbackEntity>()
      .exec();

    if (!updated) {
      throw new Error('Feedback not found for comment insertion.');
    }

    return updated;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
