import { FeedbackSource } from './feedback-source.enum';

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  text: string;
  name?: string;
  createdAt: string;
}

export interface FeedbackEntity {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  source: FeedbackSource;
  status?: string;
  publicSubmitterName?: string;
  publicSubmitterEmail?: string;
  customerId?: string;
  votes: number;
  voterIds: string[];
  comments?: FeedbackComment[];
  createdAt: string;
}
