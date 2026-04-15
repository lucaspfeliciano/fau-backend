import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { InitiativeEntity } from '../entities/initiative.entity';
import { InitiativeStatus } from '../entities/initiative-status.enum';
import type { InitiativesRepository } from './initiatives-repository.interface';
import { PlanningInitiativeModel } from './initiative.schema';

@Injectable()
export class MongoInitiativesRepository implements InitiativesRepository {
  constructor(
    @InjectModel(PlanningInitiativeModel.name)
    private readonly initiativeModel: Model<PlanningInitiativeModel>,
  ) {}

  async insert(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel.create({
      ...initiative,
      organizationId: initiative.organizationId ?? initiative.workspaceId,
    });
  }

  async update(initiative: InitiativeEntity): Promise<void> {
    const tenantId = initiative.workspaceId;

    await this.initiativeModel
      .updateOne(
        {
          id: initiative.id,
          $or: [{ workspaceId: tenantId }, { organizationId: tenantId }],
        },
        {
          $set: {
            ...initiative,
            organizationId: initiative.organizationId ?? initiative.workspaceId,
          },
        },
      )
      .exec();
  }

  async findById(
    initiativeId: string,
    workspaceId: string,
  ): Promise<InitiativeEntity | undefined> {
    const doc = await this.initiativeModel
      .findOne({
        id: initiativeId,
        ...this.buildTenantFilter(workspaceId),
      })
      .select({ _id: 0 })
      .lean<InitiativeEntity>()
      .exec();

    if (!doc) {
      return undefined;
    }

    return this.normalize(doc, workspaceId);
  }

  async listByWorkspace(workspaceId: string): Promise<InitiativeEntity[]> {
    const docs = await this.initiativeModel
      .find(this.buildTenantFilter(workspaceId))
      .sort({ title: 1 })
      .select({ _id: 0 })
      .lean<InitiativeEntity[]>()
      .exec();

    return docs.map((doc) => this.normalize(doc, workspaceId));
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      status?: InitiativeStatus;
      search?: string;
    },
  ): Promise<{ items: InitiativeEntity[]; total: number }> {
    const tenantFilter = this.buildTenantFilter(workspaceId);

    const filter: Record<string, unknown> = {
      ...tenantFilter,
    };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$and = [
        tenantFilter,
        {
          $or: [{ title: searchRegex }, { description: searchRegex }],
        },
      ];
      delete filter.$or;
    }

    const total = await this.initiativeModel.countDocuments(filter).exec();
    const items = await this.initiativeModel
      .find(filter)
      .sort({ title: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<InitiativeEntity[]>()
      .exec();

    return {
      items: items.map((item) => this.normalize(item, workspaceId)),
      total,
    };
  }

  private normalize(
    initiative: InitiativeEntity,
    workspaceId: string,
  ): InitiativeEntity {
    const normalizedWorkspaceId =
      initiative.workspaceId ?? initiative.organizationId ?? workspaceId;

    return {
      ...initiative,
      workspaceId: normalizedWorkspaceId,
      organizationId: initiative.organizationId ?? normalizedWorkspaceId,
      requestIds: initiative.requestIds ?? [],
    };
  }

  private buildTenantFilter(workspaceId: string) {
    return {
      $or: [{ workspaceId }, { organizationId: workspaceId }],
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
