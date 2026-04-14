import type { FeedbackSource } from '../entities/feedback-source.enum';
import type { FeedbackEntity } from '../entities/feedback.entity';

export const FEEDBACKS_REPOSITORY = 'FEEDBACKS_REPOSITORY';

export interface FeedbacksRepository {
  insert(feedback: FeedbackEntity): Promise<void>;
  listByWorkspace(workspaceId: string): Promise<FeedbackEntity[]>;
  queryByWorkspace?: (
    workspaceId: string,
    options: {
      page: number;
      limit: number;
      source?: FeedbackSource;
      customerId?: string;
      search?: string;
    },
  ) => Promise<{ items: FeedbackEntity[]; total: number }>;
  findByIds(ids: string[], workspaceId: string): Promise<FeedbackEntity[]>;
}
