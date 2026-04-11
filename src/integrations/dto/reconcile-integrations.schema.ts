import { z } from 'zod';
import { IntegrationProvider } from '../entities/integration-provider.enum';

export const ReconcileIntegrationsSchema = z.object({
  provider: z.nativeEnum(IntegrationProvider).optional(),
  dryRun: z.boolean().default(false),
  autoResolveMissingInternal: z.boolean().default(true),
});

export type ReconcileIntegrationsInput = z.infer<
  typeof ReconcileIntegrationsSchema
>;
