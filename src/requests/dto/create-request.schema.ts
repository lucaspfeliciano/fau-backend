import { z } from 'zod';
import { RequestSourceType } from '../entities/request-source-type.enum';
import { RequestStatus } from '../entities/request-status.enum';

export const CreateRequestSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(2000),
  boardId: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  customerIds: z.array(z.string().trim().min(1)).max(20).optional(),
  companyIds: z.array(z.string().trim().min(1)).max(20).optional(),
  sourceType: z.nativeEnum(RequestSourceType).optional(),
  sourceRef: z.string().trim().min(1).max(200).optional(),
});

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;
