export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  publicPortalEnabled: boolean;
  publicRoadmapEnabled: boolean;
  publicChangelogEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
