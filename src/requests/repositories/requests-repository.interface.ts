import type { RequestEntity } from '../entities/request.entity';

export const REQUESTS_REPOSITORY = 'REQUESTS_REPOSITORY';

export interface RequestsRepository {
  insert(request: RequestEntity): Promise<void>;
  update(request: RequestEntity): Promise<void>;
  listByOrganization(organizationId: string): Promise<RequestEntity[]>;
  queryByOrganization?: (
    organizationId: string,
    options: {
      page: number;
      limit: number;
      includeArchived: boolean;
      status?: string;
      customerId?: string;
      boardId?: string;
      tag?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) => Promise<{ items: RequestEntity[]; total: number }>;
  findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): Promise<RequestEntity | undefined>;
}
