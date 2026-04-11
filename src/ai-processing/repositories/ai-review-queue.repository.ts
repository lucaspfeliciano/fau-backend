import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AiReviewQueueItemEntity } from '../entities/ai-review-queue-item.entity';
import type { AiReviewQueueStatus } from '../entities/ai-review-queue-status.enum';
import { AiReviewQueueItemModel } from './ai-review-queue-item.schema';

@Injectable()
export class AiReviewQueueRepository {
  constructor(
    @InjectModel(AiReviewQueueItemModel.name)
    private readonly aiReviewQueueItemModel: Model<AiReviewQueueItemModel>,
  ) {}

  async insert(item: AiReviewQueueItemEntity): Promise<void> {
    await this.aiReviewQueueItemModel.create(item);
  }

  async update(item: AiReviewQueueItemEntity): Promise<void> {
    await this.aiReviewQueueItemModel
      .updateOne(
        {
          id: item.id,
          organizationId: item.organizationId,
        },
        {
          $set: item,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<AiReviewQueueItemEntity | undefined> {
    const doc = await this.aiReviewQueueItemModel
      .findOne({ id, organizationId })
      .select({ _id: 0 })
      .lean<AiReviewQueueItemEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(
    organizationId: string,
    status?: AiReviewQueueStatus,
  ): Promise<AiReviewQueueItemEntity[]> {
    const filter: Record<string, unknown> = { organizationId };
    if (status) {
      filter.status = status;
    }

    return this.aiReviewQueueItemModel
      .find(filter)
      .sort({ createdAt: -1 })
      .select({ _id: 0 })
      .lean<AiReviewQueueItemEntity[]>()
      .exec();
  }
}
