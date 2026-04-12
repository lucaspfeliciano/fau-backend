import { z } from 'zod';

export const StatusMappingItemSchema = z.object({
  linearStatus: z.string().trim().min(1).max(100),
  internalStatus: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
});

export const UpdateStatusMappingSchema = z.object({
  items: z.array(StatusMappingItemSchema).min(1).max(50),
});

export type UpdateStatusMappingInput = z.infer<
  typeof UpdateStatusMappingSchema
>;
