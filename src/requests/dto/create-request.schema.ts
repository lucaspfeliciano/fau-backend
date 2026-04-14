import { z } from 'zod';
import { RequestSourceType } from '../entities/request-source-type.enum';
import { RequestStatus } from '../entities/request-status.enum';

export const CreateRequestSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  feedbackIds: z.array(z.string().trim().min(1)).max(200).optional(),
  customerIds: z.array(z.string().trim().min(1)).max(200).optional(),
  problems: z.array(z.string().trim().min(3).max(400)).max(100).optional(),
  solutions: z.array(z.string().trim().min(3).max(400)).max(100).optional(),
  product: z.string().trim().min(2).max(120).optional(),
  functionality: z.string().trim().min(2).max(120).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  // Legacy compatibility fields.
  boardId: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  companyIds: z.array(z.string().trim().min(1)).max(200).optional(),
  sourceType: z.nativeEnum(RequestSourceType).optional(),
  sourceRef: z.string().trim().min(1).max(200).optional(),
  publicSubmitterName: z.string().trim().min(2).max(120).optional(),
  publicSubmitterEmail: z.email().trim().min(5).max(160).optional(),
});

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;
