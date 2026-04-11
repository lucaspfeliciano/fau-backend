import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { CreateCompanyInput } from './dto/create-company.schema';
import type { QueryCompaniesInput } from './dto/query-companies.schema';
import type { UpdateCompanyInput } from './dto/update-company.schema';
import { CompanyEntity } from './entities/company.entity';
import { CompaniesRepository } from './repositories/companies.repository';

export interface PaginatedCompaniesResult {
  items: CompanyEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(
    input: CreateCompanyInput,
    actor: AuthenticatedUser,
  ): Promise<CompanyEntity> {
    const now = new Date().toISOString();

    const company: CompanyEntity = {
      id: randomUUID(),
      name: input.name,
      revenue: input.revenue,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.companiesRepository.insert(company);

    this.domainEventsService.publish({
      name: 'company.created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        companyId: company.id,
      },
    });

    return company;
  }

  async list(
    query: QueryCompaniesInput,
    organizationId: string,
  ): Promise<PaginatedCompaniesResult> {
    const filtered = (
      await this.companiesRepository.listByOrganization(organizationId)
    )
      .filter((company) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return company.name.toLowerCase().includes(search);
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
  ): Promise<CompanyEntity> {
    const company = await this.companiesRepository.findById(id, organizationId);

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return company;
  }

  async update(
    id: string,
    input: UpdateCompanyInput,
    actor: AuthenticatedUser,
  ): Promise<CompanyEntity> {
    const company = await this.findOneById(id, actor.organizationId);

    if (input.name !== undefined) {
      company.name = input.name;
    }

    if (input.revenue !== undefined) {
      company.revenue = input.revenue;
    }

    company.updatedAt = new Date().toISOString();
    await this.companiesRepository.update(company);

    this.domainEventsService.publish({
      name: 'company.updated',
      occurredAt: company.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        companyId: company.id,
      },
    });

    return company;
  }
}
