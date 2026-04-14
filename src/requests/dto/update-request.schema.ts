import { z } from 'zod';
import { RequestSourceType } from '../entities/request-source-type.enum';
import { RequestStatus } from '../entities/request-status.enum';

export const UpdateRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(2000).optional(),
    feedbackIds: z.array(z.string().trim().min(1)).max(200).optional(),
    customerIds: z.array(z.string().trim().min(1)).max(200).optional(),
    problems: z.array(z.string().trim().min(3).max(400)).max(100).optional(),
    solutions: z.array(z.string().trim().min(3).max(400)).max(100).optional(),
    product: z.union([z.string().trim().min(2).max(120), z.null()]).optional(),
    functionality: z
      .union([z.string().trim().min(2).max(120), z.null()])
      .optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    // Legacy compatibility fields.
    boardId: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    companyIds: z.array(z.string().trim().min(1)).max(200).optional(),
    sourceType: z.nativeEnum(RequestSourceType).optional(),
    sourceRef: z.string().trim().min(1).max(200).optional(),
    publicSubmitterName: z
      .union([z.string().trim().min(2).max(120), z.null()])
      .optional(),
    publicSubmitterEmail: z
      .union([z.email().trim().min(5).max(160), z.null()])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;
