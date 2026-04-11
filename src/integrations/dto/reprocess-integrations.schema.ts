import { z } from 'zod';
import { IntegrationProvider } from '../entities/integration-provider.enum';

export const ReprocessIntegrationsSchema = z.object({
  provider: z.nativeEnum(IntegrationProvider),
  taskIds: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
  resetCursor: z.boolean().optional(),
});

export type ReprocessIntegrationsInput = z.infer<
  typeof ReprocessIntegrationsSchema
>;
