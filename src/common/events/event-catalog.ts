export interface DomainEventCatalogItem {
  name: string;
  boundedContext: string;
  description: string;
}

export const DOMAIN_EVENT_CATALOG: DomainEventCatalogItem[] = [
  {
    name: 'organization.created',
    boundedContext: 'organization',
    description: 'Organization provisioning completed.',
  },
  {
    name: 'auth.user_registered',
    boundedContext: 'auth',
    description: 'A user finished account registration.',
  },
  {
    name: 'auth.user_logged_in',
    boundedContext: 'auth',
    description: 'A user authenticated successfully.',
  },
  {
    name: 'user.role_changed',
    boundedContext: 'users',
    description: 'A membership role was updated.',
  },
  {
    name: 'board.created',
    boundedContext: 'boards',
    description: 'A board was created for an organization.',
  },
  {
    name: 'board.updated',
    boundedContext: 'boards',
    description: 'A board metadata update was applied.',
  },
  {
    name: 'company.created',
    boundedContext: 'companies',
    description: 'A company record was created.',
  },
  {
    name: 'company.updated',
    boundedContext: 'companies',
    description: 'A company record was updated.',
  },
  {
    name: 'customer.created',
    boundedContext: 'customers',
    description: 'A customer record was created.',
  },
  {
    name: 'customer.updated',
    boundedContext: 'customers',
    description: 'A customer record was updated.',
  },
  {
    name: 'team.created',
    boundedContext: 'teams',
    description: 'A team was created in an organization.',
  },
  {
    name: 'request.created',
    boundedContext: 'requests',
    description: 'A new request entered the backlog.',
  },
  {
    name: 'request.updated',
    boundedContext: 'requests',
    description: 'A request payload was updated.',
  },
  {
    name: 'request.status_changed',
    boundedContext: 'requests',
    description: 'A request status transition occurred.',
  },
  {
    name: 'request.archived',
    boundedContext: 'requests',
    description: 'A request was archived.',
  },
  {
    name: 'request.voted',
    boundedContext: 'requests',
    description: 'A request received an additional vote.',
  },
  {
    name: 'request.comment_added',
    boundedContext: 'requests',
    description: 'A comment was added to a request.',
  },
  {
    name: 'request.customer_linked',
    boundedContext: 'requests',
    description: 'A customer was linked to a request.',
  },
  {
    name: 'request.customer_unlinked',
    boundedContext: 'requests',
    description: 'A customer link was removed from a request.',
  },
  {
    name: 'request.company_linked',
    boundedContext: 'requests',
    description: 'A company was linked to a request.',
  },
  {
    name: 'request.company_unlinked',
    boundedContext: 'requests',
    description: 'A company link was removed from a request.',
  },
  {
    name: 'request.auto_link_applied',
    boundedContext: 'requests',
    description:
      'Deduplication auto-link increased the canonical request vote.',
  },
  {
    name: 'request.merged',
    boundedContext: 'requests',
    description: 'Two requests were merged.',
  },
  {
    name: 'request.merge_reverted',
    boundedContext: 'requests',
    description: 'A previous request merge was reverted.',
  },
  {
    name: 'request.deduplication_decision_made',
    boundedContext: 'requests',
    description: 'An intelligent deduplication decision was recorded.',
  },
  {
    name: 'product.initiative_created',
    boundedContext: 'product',
    description: 'A product initiative was created.',
  },
  {
    name: 'product.initiative_updated',
    boundedContext: 'product',
    description: 'A product initiative was updated.',
  },
  {
    name: 'product.initiative_status_changed',
    boundedContext: 'product',
    description: 'A product initiative status changed.',
  },
  {
    name: 'product.feature_created',
    boundedContext: 'product',
    description: 'A product feature was created.',
  },
  {
    name: 'product.feature_updated',
    boundedContext: 'product',
    description: 'A product feature was updated.',
  },
  {
    name: 'product.feature_status_changed',
    boundedContext: 'product',
    description: 'A product feature status changed.',
  },
  {
    name: 'product.feature_request_linked',
    boundedContext: 'product',
    description: 'A request was linked to a feature.',
  },
  {
    name: 'engineering.sprint_created',
    boundedContext: 'engineering',
    description: 'A sprint was created.',
  },
  {
    name: 'engineering.sprint_updated',
    boundedContext: 'engineering',
    description: 'A sprint was updated.',
  },
  {
    name: 'engineering.sprint_status_changed',
    boundedContext: 'engineering',
    description: 'A sprint status transition occurred.',
  },
  {
    name: 'engineering.task_created',
    boundedContext: 'engineering',
    description: 'A task was created.',
  },
  {
    name: 'engineering.task_updated',
    boundedContext: 'engineering',
    description: 'A task was updated.',
  },
  {
    name: 'engineering.task_status_changed',
    boundedContext: 'engineering',
    description: 'A task status transition occurred.',
  },
  {
    name: 'release.created',
    boundedContext: 'notifications',
    description: 'A release was created.',
  },
  {
    name: 'release.updated',
    boundedContext: 'notifications',
    description: 'A release was updated.',
  },
  {
    name: 'roadmap.view_created',
    boundedContext: 'roadmap',
    description: 'A roadmap view was created.',
  },
  {
    name: 'roadmap.view_updated',
    boundedContext: 'roadmap',
    description: 'A roadmap view was updated.',
  },
  {
    name: 'roadmap.view_deleted',
    boundedContext: 'roadmap',
    description: 'A roadmap view was deleted.',
  },
  {
    name: 'ai.processing_failed',
    boundedContext: 'ai-processing',
    description: 'AI import processing failed.',
  },
  {
    name: 'ai.processing_completed',
    boundedContext: 'ai-processing',
    description: 'AI import processing completed.',
  },
  {
    name: 'ai.request_created',
    boundedContext: 'ai-processing',
    description: 'AI processing created a request.',
  },
  {
    name: 'ai.request_deduplicated',
    boundedContext: 'ai-processing',
    description: 'AI processing detected a duplicate request.',
  },
  {
    name: 'ai.request_merged',
    boundedContext: 'ai-processing',
    description: 'AI processing merged duplicate requests.',
  },
  {
    name: 'ai.review_queue_item_created',
    boundedContext: 'ai-processing',
    description: 'A new AI review queue item was created.',
  },
  {
    name: 'ai.review_queue_item_approved',
    boundedContext: 'ai-processing',
    description: 'A review queue item was approved.',
  },
  {
    name: 'ai.review_queue_item_rejected',
    boundedContext: 'ai-processing',
    description: 'A review queue item was rejected.',
  },
  {
    name: 'ai.review_queue_batch_approved',
    boundedContext: 'ai-processing',
    description: 'A review queue batch was approved.',
  },
  {
    name: 'integrations.reconciliation_executed',
    boundedContext: 'integrations',
    description: 'Integration reconciliation run completed.',
  },
  {
    name: 'integrations.reprocess_triggered',
    boundedContext: 'integrations',
    description: 'Integration reprocess workflow was triggered.',
  },
  {
    name: 'integrations.fireflies_transcript_imported',
    boundedContext: 'integrations',
    description: 'A Fireflies transcript was imported.',
  },
  {
    name: 'integrations.provider_call_succeeded',
    boundedContext: 'integrations',
    description: 'An external provider call succeeded.',
  },
  {
    name: 'integrations.provider_call_failed',
    boundedContext: 'integrations',
    description: 'An external provider call failed.',
  },
  {
    name: 'integrations.external_mutation_audited',
    boundedContext: 'integrations',
    description: 'An external mutation was audited.',
  },
  {
    name: 'integrations.conflict_detected',
    boundedContext: 'integrations',
    description: 'A conflict was detected during integration sync.',
  },
  {
    name: 'integrations.webhook_signature_rejected',
    boundedContext: 'integrations',
    description: 'Webhook signature validation failed.',
  },
];
