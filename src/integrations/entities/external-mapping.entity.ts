import { IntegrationProvider } from './integration-provider.enum';

export interface ExternalMappingEntity {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  entityType:
    | 'request'
    | 'feature'
    | 'task'
    | 'company'
    | 'customer'
    | 'sprint'
    | 'event'
    | 'transcript';
  internalId: string;
  externalId: string;
  syncedAt: string;
}
