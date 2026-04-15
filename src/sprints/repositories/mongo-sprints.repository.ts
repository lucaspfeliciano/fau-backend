import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SprintEntity } from '../entities/sprint.entity';
import { SprintStatus } from '../entities/sprint-status.enum';
import type { SprintsRepository } from './sprints-repository.interface';
import { PlanningSprintModel } from './sprint.schema';

@Injectable()
export class MongoSprintsRepository implements SprintsRepository {
  constructor(
    @InjectModel(PlanningSprintModel.name)
    private readonly sprintModel: Model<PlanningSprintModel>,
  ) {}

  async insert(sprint: SprintEntity): Promise<void> {
    await this.sprintModel.create({
      ...sprint,
      organizationId: sprint.organizationId ?? sprint.workspaceId,
    });
  }

  async update(sprint: SprintEntity): Promise<void> {
    const tenantId = sprint.workspaceId;

    await this.sprintModel
      .updateOne(
        {
          id: sprint.id,
          $or: [{ workspaceId: tenantId }, { organizationId: tenantId }],
        },
        {
          $set: {
            ...sprint,
            organizationId: sprint.organizationId ?? sprint.workspaceId,
          },
        },
      )
      .exec();
  }

  async findById(
    sprintId: string,
    workspaceId: string,
  ): Promise<SprintEntity | undefined> {
    const doc = await this.sprintModel
      .findOne({
        id: sprintId,
        ...this.buildTenantFilter(workspaceId),
      })
      .select({ _id: 0 })
      .lean<SprintEntity>()
      .exec();

    if (!doc) {
      return undefined;
    }

    return this.normalize(doc, workspaceId);
  }

  async listByWorkspace(workspaceId: string): Promise<SprintEntity[]> {
    const docs = await this.sprintModel
      .find(this.buildTenantFilter(workspaceId))
      .sort({ name: 1 })
      .select({ _id: 0 })
      .lean<SprintEntity[]>()
      .exec();

    return docs.map((doc) => this.normalize(doc, workspaceId));
  }

  async queryByWorkspace(
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      initiativeId?: string;
      status?: SprintStatus;
      squad?: string;
      search?: string;
    },
  ): Promise<{ items: SprintEntity[]; total: number }> {
    const tenantFilter = this.buildTenantFilter(workspaceId);

    const filter: Record<string, unknown> = {
      ...tenantFilter,
    };

    if (options.initiativeId) {
      filter.initiativeId = options.initiativeId;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.squad) {
      filter.squad = options.squad;
    }

    if (options.search) {
      const searchRegex = {
        $regex: this.escapeRegex(options.search),
        $options: 'i',
      };
      filter.$and = [
        tenantFilter,
        {
          $or: [
            { name: searchRegex },
            { squad: searchRegex },
            { externalLinearSprintId: searchRegex },
          ],
        },
      ];
      delete filter.$or;
    }

    const total = await this.sprintModel.countDocuments(filter).exec();
    const items = await this.sprintModel
      .find(filter)
      .sort({ name: 1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .select({ _id: 0 })
      .lean<SprintEntity[]>()
      .exec();

    return {
      items: items.map((item) => this.normalize(item, workspaceId)),
      total,
    };
  }

  private normalize(sprint: SprintEntity, workspaceId: string): SprintEntity {
    const normalizedWorkspaceId =
      sprint.workspaceId ?? sprint.organizationId ?? workspaceId;

    return {
      ...sprint,
      workspaceId: normalizedWorkspaceId,
      organizationId: sprint.organizationId ?? normalizedWorkspaceId,
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
