import type { FeedbackSource } from '../entities/feedback-source.enum';
import type {
  FeedbackComment,
  FeedbackEntity,
} from '../entities/feedback.entity';

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
      status?: string;
      sortBy?: 'recent' | 'votes';
    },
  ) => Promise<{ items: FeedbackEntity[]; total: number }>;
  findByIds(ids: string[], workspaceId: string): Promise<FeedbackEntity[]>;
  incrementVotes(
    feedbackId: string,
    workspaceId: string,
    fingerprint?: string,
  ): Promise<FeedbackEntity>;
  addComment(
    feedbackId: string,
    workspaceId: string,
    comment: FeedbackComment,
  ): Promise<FeedbackEntity>;
}
