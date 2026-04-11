import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationModel } from './organization.schema';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectModel(OrganizationModel.name)
    private readonly organizationModel: Model<OrganizationModel>,
  ) {}

  async insert(organization: OrganizationEntity): Promise<void> {
    await this.organizationModel.create(organization);
  }

  async findById(id: string): Promise<OrganizationEntity | undefined> {
    const doc = await this.organizationModel
      .findOne({ id })
      .lean<OrganizationEntity>()
      .exec();

    return doc ?? undefined;
  }
}
