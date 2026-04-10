import { z } from 'zod';
import { FeatureStatus } from '../entities/feature-status.enum';
import { ProductPriority } from '../entities/product-priority.enum';

const toPositiveInt = (defaultValue: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    max ? z.number().int().min(1).max(max) : z.number().int().min(1),
  );

export const QueryFeaturesSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  status: z.nativeEnum(FeatureStatus).optional(),
  priority: z.nativeEnum(ProductPriority).optional(),
  initiativeId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type QueryFeaturesInput = z.infer<typeof QueryFeaturesSchema>;
