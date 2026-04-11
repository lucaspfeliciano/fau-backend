import { z } from 'zod';
import { RequestStatus } from '../entities/request-status.enum';

const toPositiveInt = (defaultValue: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    max ? z.number().int().min(1).max(max) : z.number().int().min(1),
  );

const toBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  return Boolean(value);
}, z.boolean());

export const QueryRequestsSchema = z.object({
  page: toPositiveInt(1),
  limit: toPositiveInt(20, 100),
  boardId: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  tag: z.string().trim().min(1).max(30).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  includeArchived: toBoolean,
});

export type QueryRequestsInput = z.infer<typeof QueryRequestsSchema>;
