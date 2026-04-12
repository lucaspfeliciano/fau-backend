export interface ReleaseEntity {
  id: string;
  version: string;
  title: string;
  notes: string;
  status: 'draft' | 'scheduled' | 'published';
  featureIds: string[];
  sprintIds: string[];
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
}
