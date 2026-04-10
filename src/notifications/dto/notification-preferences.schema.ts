import { z } from 'zod';

export const NotificationPreferencesSchema = z.object({
  teamId: z.string().trim().min(1).max(80).optional(),
  notifyRequestStatus: z.boolean().optional(),
  notifyFeatureStatus: z.boolean().optional(),
  notifySprintStatus: z.boolean().optional(),
  notifyRelease: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<
  typeof NotificationPreferencesSchema
>;
