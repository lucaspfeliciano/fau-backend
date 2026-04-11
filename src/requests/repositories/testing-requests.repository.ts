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
