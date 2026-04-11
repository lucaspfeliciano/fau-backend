import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainEventsService } from '../common/events/domain-events.service';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import type { CreateBoardInput } from './dto/create-board.schema';
import type { QueryBoardsInput } from './dto/query-boards.schema';
import type { UpdateBoardInput } from './dto/update-board.schema';
import type { BoardEntity } from './entities/board.entity';
import { BoardsRepository } from './repositories/boards.repository';

export interface PaginatedBoardsResult {
  items: BoardEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(
    input: CreateBoardInput,
    actor: AuthenticatedUser,
  ): Promise<BoardEntity> {
    const normalizedName = input.name.trim();
    const existing = await this.boardsRepository.findByName(
      normalizedName,
      actor.organizationId,
    );

    if (existing) {
      throw new BadRequestException('Board name already exists.');
    }

    const now = new Date().toISOString();
    const board: BoardEntity = {
      id: randomUUID(),
      name: normalizedName,
      description: input.description,
      organizationId: actor.organizationId,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.boardsRepository.insert(board);

    this.domainEventsService.publish({
      name: 'board.created',
      occurredAt: now,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        boardId: board.id,
      },
    });

    return board;
  }

  async list(
    query: QueryBoardsInput,
    organizationId: string,
  ): Promise<PaginatedBoardsResult> {
    const filtered = (
      await this.boardsRepository.listByOrganization(organizationId)
    )
      .filter((board) => {
        if (!query.search) {
          return true;
        }

        const search = query.search.toLowerCase();
        return (
          board.name.toLowerCase().includes(search) ||
          board.description?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page;
    const limit = query.limit;
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

  async update(
    id: string,
    input: UpdateBoardInput,
    actor: AuthenticatedUser,
  ): Promise<BoardEntity> {
    const board = await this.findById(id, actor.organizationId);

    if (input.name !== undefined) {
      const normalizedName = input.name.trim();
      const existing = await this.boardsRepository.findByName(
        normalizedName,
        actor.organizationId,
      );

      if (existing && existing.id !== board.id) {
        throw new BadRequestException('Board name already exists.');
      }

      board.name = normalizedName;
    }

    if (input.description !== undefined) {
      board.description = input.description ?? undefined;
    }

    board.updatedAt = new Date().toISOString();
    await this.boardsRepository.update(board);

    this.domainEventsService.publish({
      name: 'board.updated',
      occurredAt: board.updatedAt,
      actorId: actor.id,
      organizationId: actor.organizationId,
      payload: {
        boardId: board.id,
      },
    });

    return board;
  }

  async findById(id: string, organizationId: string): Promise<BoardEntity> {
    const board = await this.boardsRepository.findById(id, organizationId);

    if (!board) {
      throw new NotFoundException('Board not found.');
    }

    return board;
  }
}
