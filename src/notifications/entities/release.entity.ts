export interface ReleaseEntity {
  id: string;
  version: string;
  title: string;
  notes: string;
  featureIds: string[];
  sprintIds: string[];
  organizationId: string;
  createdBy: string;
  createdAt: string;
}
