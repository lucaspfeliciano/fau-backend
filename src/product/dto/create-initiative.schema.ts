import { z } from 'zod';
import { InitiativeStatus } from '../entities/initiative-status.enum';
import { ProductPriority } from '../entities/product-priority.enum';

export const CreateInitiativeSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  status: z.nativeEnum(InitiativeStatus).optional(),
  priority: z.nativeEnum(ProductPriority).optional(),
});

export type CreateInitiativeInput = z.infer<typeof CreateInitiativeSchema>;
