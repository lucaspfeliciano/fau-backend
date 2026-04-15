import { z } from 'zod';

export const CreateAuditEventSchema = z.object({
  action: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  resourceType: z.string().trim().min(1).max(80).optional(),
  resourceId: z.string().trim().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAuditEventInput = z.infer<typeof CreateAuditEventSchema>;
