import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CustomerEntity } from '../entities/customer.entity';
import { CustomerModel } from './customer.schema';

@Injectable()
export class CustomersRepository {
  constructor(
    @InjectModel(CustomerModel.name)
    private readonly customerModel: Model<CustomerModel>,
  ) {}

  async insert(customer: CustomerEntity): Promise<void> {
    await this.customerModel.create({
      ...customer,
      organizationId: customer.organizationId ?? customer.workspaceId,
    });
  }

  async update(customer: CustomerEntity): Promise<void> {
    const normalizedCustomer: CustomerEntity = {
      ...customer,
      organizationId: customer.organizationId ?? customer.workspaceId,
    };

    await this.customerModel
      .updateOne(
        {
          id: customer.id,
          $or: [
            { workspaceId: customer.workspaceId },
            { organizationId: customer.workspaceId },
          ],
        },
        {
          $set: normalizedCustomer,
        },
      )
      .exec();
  }

  async listByOrganization(organizationId: string): Promise<CustomerEntity[]> {
    const docs = await this.customerModel
      .find({
        $or: [{ workspaceId: organizationId }, { organizationId }],
      })
      .sort({ updatedAt: -1 })
      .lean<CustomerEntity[]>()
      .exec();

    return docs.map((doc) => this.normalize(doc, organizationId));
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomerEntity | undefined> {
    const doc = await this.customerModel
      .findOne({
        id,
        $or: [{ workspaceId: organizationId }, { organizationId }],
      })
      .lean<CustomerEntity>()
      .exec();

    if (!doc) {
      return undefined;
    }

    return this.normalize(doc, organizationId);
  }

  async findByEmail(
    email: string,
    organizationId: string,
  ): Promise<CustomerEntity | undefined> {
    const doc = await this.customerModel
      .findOne({
        email,
        $or: [{ workspaceId: organizationId }, { organizationId }],
      })
      .lean<CustomerEntity>()
      .exec();

    if (!doc) {
      return undefined;
    }

    return this.normalize(doc, organizationId);
  }

  private normalize(
    customer: CustomerEntity,
    organizationId: string,
  ): CustomerEntity {
    const workspaceId =
      customer.workspaceId ?? customer.organizationId ?? organizationId;

    return {
      ...customer,
      workspaceId,
      organizationId: customer.organizationId ?? workspaceId,
    };
  }
}
