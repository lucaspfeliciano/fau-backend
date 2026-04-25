import { z } from 'zod';

export const UpdatePublicWorkspaceSettingsSchema = z
  .object({
    logoUrl: z.string().optional().nullable(),
    subtitle: z.string().max(200).optional().nullable(),
    widgetEnabled: z.boolean().optional(),
    rotateWidgetApiKey: z.boolean().optional(),
    publicPortalEnabled: z.boolean().optional(),
    publicRoadmapEnabled: z.boolean().optional(),
    publicChangelogEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdatePublicWorkspaceSettingsInput = z.infer<
  typeof UpdatePublicWorkspaceSettingsSchema
>;
