import { FeedbackSource } from './feedback-source.enum';

export interface FeedbackEntity {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  source: FeedbackSource;
  publicSubmitterName?: string;
  publicSubmitterEmail?: string;
  customerId?: string;
  votes?: number;
  createdAt: string;
}
