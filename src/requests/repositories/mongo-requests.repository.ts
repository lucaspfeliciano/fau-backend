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
    await this.requestModel
      .updateOne(
        {
          id: request.id,
          organizationId: request.organizationId,
        },
        {
          $set: request,
        },
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
}
