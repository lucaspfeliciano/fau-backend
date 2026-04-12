import { Injectable } from '@nestjs/common';
import type { RequestEntity } from '../entities/request.entity';
import type { RequestsRepository } from './requests-repository.interface';

@Injectable()
export class TestingRequestsRepository implements RequestsRepository {
  private readonly requests: RequestEntity[] = [];

  async insert(request: RequestEntity): Promise<void> {
    this.requests.push(request);
  }

  async update(request: RequestEntity): Promise<void> {
    const index = this.requests.findIndex(
      (item) =>
        item.id === request.id &&
        item.organizationId === request.organizationId,
    );

    if (index >= 0) {
      this.requests[index] = request;
    }
  }

  async listByOrganization(organizationId: string): Promise<RequestEntity[]> {
    return this.requests.filter(
      (request) => request.organizationId === organizationId,
    );
  }

  async queryByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      includeArchived: boolean;
      status?: string;
      boardId?: string;
      tag?: string;
      search?: string;
    },
  ): Promise<{ items: RequestEntity[]; total: number }> {
    const filtered = this.requests
      .filter((request) => request.organizationId === organizationId)
      .filter((request) => {
        if (options.includeArchived) {
          return true;
        }

        return !request.deletedAt;
      })
      .filter((request) => {
        if (!options.status) {
          return true;
        }

        return request.status === options.status;
      })
      .filter((request) => {
        if (!options.boardId) {
          return true;
        }

        return request.boardId === options.boardId;
      })
      .filter((request) => {
        if (!options.tag) {
          return true;
        }

        const targetTag = options.tag.toLowerCase();
        return request.tags.some((tag) => tag.toLowerCase() === targetTag);
      })
      .filter((request) => {
        if (!options.search) {
          return true;
        }

        const search = options.search.toLowerCase();
        return (
          request.title.toLowerCase().includes(search) ||
          request.description.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = filtered.length;
    const offset = (options.page - 1) * options.limit;

    return {
      items: filtered.slice(offset, offset + options.limit),
      total,
    };
  }

  async findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): Promise<RequestEntity | undefined> {
    return this.requests.find((item) => {
      if (item.id !== requestId || item.organizationId !== organizationId) {
        return false;
      }

      if (!includeArchived && item.deletedAt) {
        return false;
      }

      return true;
    });
  }
}
