import { RequestSourceType } from './request-source-type.enum';

export interface RequestCommentEntity {
  id: string;
  requestId: string;
  organizationId: string;
  comment: string;
  createdBy: string;
  sourceType?: RequestSourceType;
  publicAuthorName?: string;
  publicAuthorEmail?: string;
  createdAt: string;
}
