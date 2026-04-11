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
    await this.customerModel.create(customer);
  }

  async update(customer: CustomerEntity): Promise<void> {
    await this.customerModel
      .updateOne(
        {
          id: customer.id,
          organizationId: customer.organizationId,
        },
        {
          $set: customer,
        },
      )
      .exec();
  }

  async listByOrganization(organizationId: string): Promise<CustomerEntity[]> {
    return this.customerModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .lean<CustomerEntity[]>()
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomerEntity | undefined> {
    const doc = await this.customerModel
      .findOne({ id, organizationId })
      .lean<CustomerEntity>()
      .exec();

    return doc ?? undefined;
  }

  async findByEmail(
    email: string,
    organizationId: string,
  ): Promise<CustomerEntity | undefined> {
    const doc = await this.customerModel
      .findOne({
        email,
        organizationId,
      })
      .lean<CustomerEntity>()
      .exec();

    return doc ?? undefined;
  }
}
