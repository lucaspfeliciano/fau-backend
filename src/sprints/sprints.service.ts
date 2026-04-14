import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { InitiativesService } from '../initiatives/initiatives.service';
import type { CreateSprintDto } from './dto/create-sprint.dto';
import type { QuerySprintsDto } from './dto/query-sprints.dto';
import type { UpdateSprintDto } from './dto/update-sprint.dto';
import type { SprintEntity } from './entities/sprint.entity';
import {
  PLANNING_SPRINTS_REPOSITORY,
  type SprintsRepository,
} from './repositories/sprints-repository.interface';

export interface PaginatedSprintsResult {
  items: SprintEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class SprintsService {
  constructor(
    @Inject(PLANNING_SPRINTS_REPOSITORY)
    private readonly sprintsRepository: SprintsRepository,
    private readonly initiativesService: InitiativesService,
  ) {}

  async create(
    input: CreateSprintDto,
    actor: AuthenticatedUser,
  ): Promise<SprintEntity> {
    await this.initiativesService.findOneById(
      input.initiativeId,
      actor.organizationId,
    );

    const sprint: SprintEntity = {
      id: randomUUID(),
      workspaceId: actor.organizationId,
      initiativeId: input.initiativeId.trim(),
      name: input.name.trim(),
      status: input.status.trim(),
      eta: input.eta?.trim() || undefined,
      squad: input.squad?.trim() || undefined,
      externalLinearSprintId: input.externalLinearSprintId?.trim() || undefined,
    };

    await this.sprintsRepository.insert(sprint);
    return sprint;
  }

  async list(
    query: QuerySprintsDto,
    workspaceId: string,
  ): Promise<PaginatedSprintsResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (this.sprintsRepository.queryByWorkspace) {
      const result = await this.sprintsRepository.queryByWorkspace(
        workspaceId,
        {
          page,
          limit,
          initiativeId: query.initiativeId,
          status: query.status,
          squad: query.squad,
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

    const filtered = (await this.sprintsRepository.listByWorkspace(workspaceId))
      .filter((item) => {
        if (!query.initiativeId) {
          return true;
        }

        return item.initiativeId === query.initiativeId;
      })
      .filter((item) => {
        if (!query.status) {
          return true;
        }

        return item.status === query.status;
      })
      .filter((item) => {
        if (!query.squad) {
          return true;
        }

        return item.squad === query.squad;
      })
      .filter((item) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          item.name.toLowerCase().includes(search) ||
          (item.squad ?? '').toLowerCase().includes(search) ||
          (item.externalLinearSprintId ?? '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

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

  async findOneById(id: string, workspaceId: string): Promise<SprintEntity> {
    const sprint = await this.sprintsRepository.findById(id, workspaceId);

    if (!sprint) {
      throw new NotFoundException('Sprint not found.');
    }

    return sprint;
  }

  async update(
    id: string,
    input: UpdateSprintDto,
    actor: AuthenticatedUser,
  ): Promise<SprintEntity> {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update.',
      );
    }

    const sprint = await this.findOneById(id, actor.organizationId);

    if (input.initiativeId !== undefined) {
      await this.initiativesService.findOneById(
        input.initiativeId,
        actor.organizationId,
      );
      sprint.initiativeId = input.initiativeId.trim();
    }

    if (input.name !== undefined) {
      sprint.name = input.name.trim();
    }

    if (input.status !== undefined) {
      sprint.status = input.status.trim();
    }

    if (input.eta !== undefined) {
      sprint.eta = input.eta.trim() || undefined;
    }

    if (input.squad !== undefined) {
      sprint.squad = input.squad.trim() || undefined;
    }

    if (input.externalLinearSprintId !== undefined) {
      sprint.externalLinearSprintId =
        input.externalLinearSprintId.trim() || undefined;
    }

    await this.sprintsRepository.update(sprint);
    return sprint;
  }
}
