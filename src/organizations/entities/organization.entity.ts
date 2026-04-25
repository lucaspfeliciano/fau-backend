export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  widgetApiKey?: string;
  widgetEnabled: boolean;
  logoUrl?: string;
  subtitle?: string;
  publicPortalEnabled: boolean;
  publicRoadmapEnabled: boolean;
  publicChangelogEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
