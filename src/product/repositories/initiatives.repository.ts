import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { InitiativeEntity } from '../entities/initiative.entity';
import { InitiativeModel } from './initiative.schema';

@Injectable()
export class InitiativesRepository {
  constructor(
    @InjectModel(InitiativeModel.name)
    private readonly initiativeModel: Model<InitiativeModel>,
  ) {}

  async insert(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel.create(initiative);
  }

  async update(initiative: InitiativeEntity): Promise<void> {
    await this.initiativeModel
      .updateOne(
        {
          id: initiative.id,
          organizationId: initiative.organizationId,
        },
        {
          $set: initiative,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<InitiativeEntity | undefined> {
    const doc = await this.initiativeModel
      .findOne({ id, organizationId })
      .lean<InitiativeEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<InitiativeEntity[]> {
    return this.initiativeModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<InitiativeEntity[]>()
      .exec();
  }
}
