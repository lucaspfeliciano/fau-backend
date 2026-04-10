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

export interface PaginatedCustomersResult {
  items: CustomerEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class CustomersService {
  private readonly customers: CustomerEntity[] = [];

  constructor(
    private readonly companiesService: CompaniesService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  create(input: CreateCustomerInput, actor: AuthenticatedUser): CustomerEntity {
    const normalizedEmail = input.email.toLowerCase();
    this.ensureEmailIsUnique(normalizedEmail, actor.organizationId);

    if (input.companyId) {
      this.companiesService.findOneById(input.companyId, actor.organizationId);
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

    this.customers.push(customer);

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

  list(
    query: QueryCustomersInput,
    organizationId: string,
  ): PaginatedCustomersResult {
    const filtered = this.customers
      .filter((customer) => customer.organizationId === organizationId)
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

  findOneById(id: string, organizationId: string): CustomerEntity {
    const customer = this.customers.find(
      (item) => item.id === id && item.organizationId === organizationId,
    );

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  update(
    id: string,
    input: UpdateCustomerInput,
    actor: AuthenticatedUser,
  ): CustomerEntity {
    const customer = this.findOneById(id, actor.organizationId);

    if (input.email !== undefined) {
      const normalizedEmail = input.email.toLowerCase();
      this.ensureEmailIsUnique(
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
        this.companiesService.findOneById(
          input.companyId,
          actor.organizationId,
        );
        customer.companyId = input.companyId;
      }
    }

    customer.updatedAt = new Date().toISOString();

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

  private ensureEmailIsUnique(
    email: string,
    organizationId: string,
    currentCustomerId?: string,
  ): void {
    const conflict = this.customers.find(
      (customer) =>
        customer.organizationId === organizationId &&
        customer.email === email &&
        customer.id !== currentCustomerId,
    );

    if (conflict) {
      throw new BadRequestException(
        'Customer email already exists in this organization.',
      );
    }
  }
}
