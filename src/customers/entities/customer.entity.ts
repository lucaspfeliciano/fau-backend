export interface CustomerEntity {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  companyId?: string;
  organizationId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
