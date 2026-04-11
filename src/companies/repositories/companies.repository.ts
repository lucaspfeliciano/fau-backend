import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CompanyEntity } from '../entities/company.entity';
import { CompanyModel } from './company.schema';

@Injectable()
export class CompaniesRepository {
  constructor(
    @InjectModel(CompanyModel.name)
    private readonly companyModel: Model<CompanyModel>,
  ) {}

  async insert(company: CompanyEntity): Promise<void> {
    await this.companyModel.create(company);
  }

  async update(company: CompanyEntity): Promise<void> {
    await this.companyModel
      .updateOne(
        {
          id: company.id,
          organizationId: company.organizationId,
        },
        {
          $set: company,
        },
      )
      .exec();
  }

  async listByOrganization(organizationId: string): Promise<CompanyEntity[]> {
    return this.companyModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<CompanyEntity[]>()
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CompanyEntity | undefined> {
    const doc = await this.companyModel
      .findOne({ id, organizationId })
      .lean<CompanyEntity>()
      .exec();

    return doc ?? undefined;
  }
}
