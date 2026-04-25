import type { RequestCommentEntity } from '../entities/request-comment.entity';

export const REQUEST_COMMENTS_REPOSITORY = 'REQUEST_COMMENTS_REPOSITORY';

export interface RequestCommentsRepository {
  insert(comment: RequestCommentEntity): Promise<void>;
  listByRequest(
    requestId: string,
    organizationId: string,
  ): Promise<RequestCommentEntity[]>;
  countByRequestIds(
    requestIds: string[],
    organizationId: string,
  ): Promise<Map<string, number>>;
}
