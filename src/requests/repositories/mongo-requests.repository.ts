import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { RequestEntity } from '../entities/request.entity';
import type { RequestsRepository } from './requests-repository.interface';
import { RequestModel } from './request.schema';

@Injectable()
export class MongoRequestsRepository implements RequestsRepository {
  constructor(
    @InjectModel(RequestModel.name)
    private readonly requestModel: Model<RequestModel>,
  ) {}

  async insert(request: RequestEntity): Promise<void> {
    await this.requestModel.create(request);
  }

  async update(request: RequestEntity): Promise<void> {
    const setPayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, ''> = {};

    for (const [key, value] of Object.entries(request)) {
      if (value === undefined) {
        unsetPayload[key] = '';
        continue;
      }

      setPayload[key] = value;
    }

    const updateOperation: Record<string, unknown> = {
      $set: setPayload,
    };

    if (Object.keys(unsetPayload).length > 0) {
      updateOperation.$unset = unsetPayload;
    }

    await this.requestModel
      .updateOne(
        {
          id: request.id,
          organizationId: request.organizationId,
        },
        updateOperation,
      )
      .exec();
  }

  async listByOrganization(organizationId: string): Promise<RequestEntity[]> {
    const docs = await this.requestModel
      .find({ organizationId })
      .lean<RequestEntity[]>()
      .exec();

    return docs;
  }

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      includeArchived: boolean;
      status?: string;
      boardId?: string;
      tag?: string;
      search?: string;
    },
  ): Promise<{ items: RequestEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
    };

    if (!options.includeArchived) {
      filter.deletedAt = { $exists: false };
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.boardId) {
      filter.boardId = options.boardId;
    }

    if (options.tag) {
      filter.tags = {
        $elemMatch: {
          $regex: `^${this.escapeRegex(options.tag)}$`,
          $options: 'i',
        },
      };
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await this.requestModel.countDocuments(filter).exec();
    const docs = await this.requestModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<RequestEntity[]>()
      .exec();

    return {
      items: docs,
      total,
    };
  }

  async findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): Promise<RequestEntity | undefined> {
    const filter: Record<string, unknown> = {
      id: requestId,
      organizationId,
    };

    if (!includeArchived) {
      filter.deletedAt = { $exists: false };
    }

    const doc = await this.requestModel
      .findOne(filter)
      .lean<RequestEntity>()
      .exec();

    return doc ?? undefined;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
