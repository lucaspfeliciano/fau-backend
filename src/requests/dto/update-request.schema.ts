import { z } from 'zod';
import { RequestSourceType } from '../entities/request-source-type.enum';
import { RequestStatus } from '../entities/request-status.enum';

export const UpdateRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    boardId: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    customerIds: z.array(z.string().trim().min(1)).max(20).optional(),
    companyIds: z.array(z.string().trim().min(1)).max(20).optional(),
    sourceType: z.nativeEnum(RequestSourceType).optional(),
    sourceRef: z.string().trim().min(1).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;
