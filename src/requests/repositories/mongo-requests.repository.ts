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
    await this.requestModel.create({
      ...request,
      organizationId: request.organizationId ?? request.workspaceId,
    });
  }

  async update(request: RequestEntity): Promise<void> {
    const tenantId = request.workspaceId ?? request.organizationId;

    const normalizedRequest: Record<string, unknown> = {
      ...request,
      workspaceId: request.workspaceId ?? tenantId,
      organizationId: request.organizationId ?? tenantId,
    };

    const setPayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, ''> = {};

    for (const [key, value] of Object.entries(normalizedRequest)) {
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
          $or: [{ workspaceId: tenantId }, { organizationId: tenantId }],
        },
        updateOperation,
      )
      .exec();
  }

  async listByOrganization(organizationId: string): Promise<RequestEntity[]> {
    const docs = await this.requestModel
      .find({
        $or: [{ workspaceId: organizationId }, { organizationId }],
      })
      .lean<RequestEntity[]>()
      .exec();

    return docs.map((doc) => this.normalize(doc, organizationId));
  }

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      includeArchived: boolean;
      status?: string;
      customerId?: string;
      boardId?: string;
      tag?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ items: RequestEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      $or: [{ workspaceId: organizationId }, { organizationId }],
    };

    if (!options.includeArchived) {
      filter.deletedAt = { $exists: false };
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.customerId) {
      filter.customerIds = options.customerId;
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
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { product: searchRegex },
        { functionality: searchRegex },
        { problems: searchRegex },
        { solutions: searchRegex },
      ];
      filter.$and = [
        { $or: [{ workspaceId: organizationId }, { organizationId }] },
      ];
    }

    const total = await this.requestModel.countDocuments(filter).exec();
    const docs = await this.requestModel
      .find(filter)
      .sort({ [options.sortBy ?? 'updatedAt']: options.sortOrder === 'asc' ? 1 : -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<RequestEntity[]>()
      .exec();

    return {
      items: docs.map((doc) => this.normalize(doc, organizationId)),
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
      $or: [{ workspaceId: organizationId }, { organizationId }],
    };

    if (!includeArchived) {
      filter.deletedAt = { $exists: false };
    }

    const doc = await this.requestModel
      .findOne(filter)
      .lean<RequestEntity>()
      .exec();

    if (!doc) {
      return undefined;
    }

    return this.normalize(doc, organizationId);
  }

  private normalize(
    request: RequestEntity,
    organizationId: string,
  ): RequestEntity {
    const workspaceId =
      request.workspaceId ?? request.organizationId ?? organizationId;

    return {
      ...request,
      workspaceId,
      organizationId: request.organizationId ?? workspaceId,
      feedbackIds: request.feedbackIds ?? [],
      customerIds: request.customerIds ?? [],
      problems: request.problems ?? [],
      solutions: request.solutions ?? [],
      tags: request.tags ?? [],
      companyIds: request.companyIds ?? [],
      votes: request.votes ?? 0,
      mergedRequestIds: request.mergedRequestIds ?? [],
      deduplicationEvidence: request.deduplicationEvidence ?? [],
      mergeHistory: request.mergeHistory ?? [],
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
