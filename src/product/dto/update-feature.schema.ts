import { z } from 'zod';
import { FeatureStatus } from '../entities/feature-status.enum';
import { ProductPriority } from '../entities/product-priority.enum';

export const UpdateFeatureSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    status: z.nativeEnum(FeatureStatus).optional(),
    priority: z.nativeEnum(ProductPriority).optional(),
    initiativeId: z.union([z.string().trim().min(1), z.null()]).optional(),
    requestIds: z.array(z.string().trim().min(1)).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateFeatureInput = z.infer<typeof UpdateFeatureSchema>;
