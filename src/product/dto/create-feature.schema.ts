import { z } from 'zod';
import { FeatureStatus } from '../entities/feature-status.enum';
import { ProductPriority } from '../entities/product-priority.enum';

export const CreateFeatureSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  status: z.nativeEnum(FeatureStatus).optional(),
  priority: z.nativeEnum(ProductPriority).optional(),
  initiativeId: z.string().trim().min(1).optional(),
  requestIds: z.array(z.string().trim().min(1)).max(50).optional(),
});

export type CreateFeatureInput = z.infer<typeof CreateFeatureSchema>;
