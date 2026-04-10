import { z } from 'zod';
import { InitiativeStatus } from '../entities/initiative-status.enum';
import { ProductPriority } from '../entities/product-priority.enum';

export const UpdateInitiativeSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    status: z.nativeEnum(InitiativeStatus).optional(),
    priority: z.nativeEnum(ProductPriority).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateInitiativeInput = z.infer<typeof UpdateInitiativeSchema>;
