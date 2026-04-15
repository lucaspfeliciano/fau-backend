import { z } from 'zod';

export const CreateRoadmapTelemetryEventSchema = z.object({
  type: z.string().trim().min(1).max(120),
  audience: z.string().trim().min(1).max(60).optional(),
  viewId: z.string().trim().min(1).max(120).optional(),
  elapsedMs: z.number().int().min(0).max(3_600_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateRoadmapTelemetryEventInput = z.infer<
  typeof CreateRoadmapTelemetryEventSchema
>;
