export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  widgetApiKey?: string;
  publicPortalEnabled: boolean;
  publicRoadmapEnabled: boolean;
  publicChangelogEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
