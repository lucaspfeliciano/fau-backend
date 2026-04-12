import { z } from 'zod';

export const UpdateWeightsSchema = z.object({
  wVotes: z.number().min(0).max(1),
  wRevenue: z.number().min(0).max(1),
  wTier: z.number().min(0).max(1),
  wChurn: z.number().min(0).max(1),
  wStrategicTag: z.number().min(0).max(1),
  strategicTags: z.array(z.string().trim().min(1).max(60)).max(50),
  churnRiskTags: z.array(z.string().trim().min(1).max(60)).max(50),
});

export type UpdateWeightsInput = z.infer<typeof UpdateWeightsSchema>;
