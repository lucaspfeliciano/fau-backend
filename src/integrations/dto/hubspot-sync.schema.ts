import { z } from 'zod';

const HubSpotCompanySchema = z.object({
  externalCompanyId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(180),
  revenue: z.number().min(0).optional(),
});

const HubSpotCustomerSchema = z.object({
  externalCustomerId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(180),
  externalCompanyId: z.string().trim().min(1).max(120).optional(),
});

export const HubSpotSyncSchema = z.object({
  companies: z.array(HubSpotCompanySchema).max(200).optional(),
  customers: z.array(HubSpotCustomerSchema).max(500).optional(),
});

export type HubSpotSyncInput = z.infer<typeof HubSpotSyncSchema>;
