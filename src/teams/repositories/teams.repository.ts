import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { TeamEntity } from '../entities/team.entity';
import { TeamModel } from './team.schema';

@Injectable()
export class TeamsRepository {
  constructor(
    @InjectModel(TeamModel.name)
    private readonly teamModel: Model<TeamModel>,
  ) {}

  async insert(team: TeamEntity): Promise<void> {
    await this.teamModel.create(team);
  }

  async listByOrganization(organizationId: string): Promise<TeamEntity[]> {
    return this.teamModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<TeamEntity[]>()
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<TeamEntity | undefined> {
    const doc = await this.teamModel
      .findOne({ id, organizationId })
      .lean<TeamEntity>()
      .exec();

    return doc ?? undefined;
  }

  async update(team: TeamEntity): Promise<void> {
    await this.teamModel
      .updateOne(
        { id: team.id, organizationId: team.organizationId },
        { $set: team },
      )
      .exec();
  }
}
