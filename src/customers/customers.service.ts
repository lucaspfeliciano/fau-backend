import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CompaniesService } from '../companies/companies.service';
import type { CreateCustomerInput } from './dto/create-customer.schema';
import type { QueryCustomersInput } from './dto/query-customers.schema';
import type { UpdateCustomerInput } from './dto/update-customer.schema';
import { CustomerEntity } from './entities/customer.entity';
import { CustomersRepository } from './repositories/customers.repository';

export interface PaginatedCustomersResult {
  items: CustomerEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly customersRepository: CustomersRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(
    input: CreateCustomerInput,
    actor: AuthenticatedUser,
  ): Promise<CustomerEntity> {
    const normalizedEmail = input.email.toLowerCase();
    await this.ensureEmailIsUnique(normalizedEmail, actor.organizationId);

    if (input.companyId) {
      await this.companiesService.findOneById(
        input.companyId,
        actor.organizationId,
      );
    }

    const now = new Date().toISOString();
    const customer: CustomerEntity = {
      id: randomUUID(),
      name: input.name,
      email: normalizedEmail,
      companyId: input.companyId,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.customersRepository.insert(customer);

    this.domainEventsService.publish({
      name: 'customer.created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        customerId: customer.id,
        companyId: customer.companyId,
      },
    });

    return customer;
  }

  async list(
    query: QueryCustomersInput,
    organizationId: string,
  ): Promise<PaginatedCustomersResult> {
    const filtered = (
      await this.customersRepository.listByOrganization(organizationId)
    )
      .filter((customer) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          customer.name.toLowerCase().includes(search) ||
          customer.email.toLowerCase().includes(search)
        );
      })
      .filter((customer) => {
        if (!query.companyId) {
          return true;
        }

        return customer.companyId === query.companyId;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const offset = (query.page - 1) * query.limit;

    return {
      items: filtered.slice(offset, offset + query.limit),
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    };
  }

  async findOneById(
    id: string,
    organizationId: string,
  ): Promise<CustomerEntity> {
    const customer = await this.customersRepository.findById(
      id,
      organizationId,
    );

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  async update(
    id: string,
    input: UpdateCustomerInput,
    actor: AuthenticatedUser,
  ): Promise<CustomerEntity> {
    const customer = await this.findOneById(id, actor.organizationId);

    if (input.email !== undefined) {
      const normalizedEmail = input.email.toLowerCase();
      await this.ensureEmailIsUnique(
        normalizedEmail,
        actor.organizationId,
        customer.id,
      );
      customer.email = normalizedEmail;
    }

    if (input.name !== undefined) {
      customer.name = input.name;
    }

    if (input.companyId !== undefined) {
      if (input.companyId === null) {
        customer.companyId = undefined;
      } else {
        await this.companiesService.findOneById(
          input.companyId,
          actor.organizationId,
        );
        customer.companyId = input.companyId;
      }
    }

    customer.updatedAt = new Date().toISOString();
    await this.customersRepository.update(customer);

    this.domainEventsService.publish({
      name: 'customer.updated',
      occurredAt: customer.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        customerId: customer.id,
        companyId: customer.companyId,
      },
    });

    return customer;
  }

  private async ensureEmailIsUnique(
    email: string,
    organizationId: string,
    currentCustomerId?: string,
  ): Promise<void> {
    const conflict = await this.customersRepository.findByEmail(
      email,
      organizationId,
    );

    if (conflict && conflict.id !== currentCustomerId) {
      throw new BadRequestException(
        'Customer email already exists in this organization.',
      );
    }
  }
}
