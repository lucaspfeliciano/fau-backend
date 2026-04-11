import type { RequestEntity } from '../entities/request.entity';

export const REQUESTS_REPOSITORY = 'REQUESTS_REPOSITORY';

export interface RequestsRepository {
  insert(request: RequestEntity): Promise<void>;
  update(request: RequestEntity): Promise<void>;
  listByOrganization(organizationId: string): Promise<RequestEntity[]>;
  findById(
    requestId: string,
    organizationId: string,
    includeArchived: boolean,
  ): Promise<RequestEntity | undefined>;
}
