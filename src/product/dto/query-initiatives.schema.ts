import { z } from 'zod';
import { InitiativeStatus } from '../entities/initiative-status.enum';
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

export const QueryInitiativesSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  status: z.nativeEnum(InitiativeStatus).optional(),
  priority: z.nativeEnum(ProductPriority).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type QueryInitiativesInput = z.infer<typeof QueryInitiativesSchema>;
