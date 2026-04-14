import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { RequestsService } from '../requests/requests.service';
import type { CreateInitiativeDto } from './dto/create-initiative.dto';
import type { QueryInitiativesDto } from './dto/query-initiatives.dto';
import type { UpdateInitiativeDto } from './dto/update-initiative.dto';
import type { InitiativeEntity } from './entities/initiative.entity';
import {
  PLANNING_INITIATIVES_REPOSITORY,
  type InitiativesRepository,
} from './repositories/initiatives-repository.interface';

export interface PaginatedInitiativesResult {
  items: InitiativeEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class InitiativesService {
  constructor(
    @Inject(PLANNING_INITIATIVES_REPOSITORY)
    private readonly initiativesRepository: InitiativesRepository,
    private readonly requestsService: RequestsService,
  ) {}

  async create(
    input: CreateInitiativeDto,
    actor: AuthenticatedUser,
  ): Promise<InitiativeEntity> {
    const requestIds = this.uniqueValues(input.requestIds);
    await this.ensureRequestsExist(requestIds, actor.organizationId);

    const initiative: InitiativeEntity = {
      id: randomUUID(),
      workspaceId: actor.organizationId,
      title: input.title.trim(),
      description: input.description.trim(),
      requestIds,
      status: input.status.trim(),
      priorityNotes: input.priorityNotes?.trim() || undefined,
    };

    await this.initiativesRepository.insert(initiative);
    return initiative;
  }

  async list(
    query: QueryInitiativesDto,
    workspaceId: string,
  ): Promise<PaginatedInitiativesResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.initiativesRepository.queryByWorkspace) {
      const result = await this.initiativesRepository.queryByWorkspace(
        workspaceId,
        {
          page,
          limit,
          status: query.status,
          search: query.search,
        },
      );

      return {
        items: result.items,
        page,
        limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit),
      };
    }

    const filtered = (
      await this.initiativesRepository.listByWorkspace(workspaceId)
    )
      .filter((item) => {
        if (!query.status) {
          return true;
        }

        return item.status === query.status;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      items: filtered.slice(offset, offset + limit),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async findOneById(
    id: string,
    workspaceId: string,
  ): Promise<InitiativeEntity> {
    const initiative = await this.initiativesRepository.findById(
      id,
      workspaceId,
    );

    if (!initiative) {
      throw new NotFoundException('Initiative not found.');
    }

    return initiative;
  }

  async update(
    id: string,
    input: UpdateInitiativeDto,
    actor: AuthenticatedUser,
  ): Promise<InitiativeEntity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const initiative = await this.findOneById(id, actor.organizationId);

    if (input.title !== undefined) {
      initiative.title = input.title.trim();
    }

    if (input.description !== undefined) {
      initiative.description = input.description.trim();
    }

    if (input.requestIds !== undefined) {
      const requestIds = this.uniqueValues(input.requestIds);
      await this.ensureRequestsExist(requestIds, actor.organizationId);
      initiative.requestIds = requestIds;
    }

    if (input.status !== undefined) {
      initiative.status = input.status.trim();
    }

    if (input.priorityNotes !== undefined) {
      initiative.priorityNotes = input.priorityNotes.trim() || undefined;
    }

    await this.initiativesRepository.update(initiative);
    return initiative;
  }

  private async ensureRequestsExist(
    requestIds: string[],
    workspaceId: string,
  ): Promise<void> {
    if (requestIds.length === 0) {
      return;
    }

    await Promise.all(
      requestIds.map((requestId) =>
        this.requestsService.findOneById(requestId, workspaceId),
      ),
    );
  }

  private uniqueValues(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const normalized = value.trim();
      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(normalized);
    }

    return result;
  }
}
