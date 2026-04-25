import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RequestStatus } from '../entities/request-status.enum';

export class QueryRequestsDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  /**
   * Alias for `limit` — sent by the frontend as `pageSize`.
   * When both are present, `limit` takes precedence.
   */
  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @ApiPropertyOptional({ enum: RequestStatus, example: RequestStatus.New })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({ example: 'customer-123' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerId?: string;

  @ApiPropertyOptional({ example: 'dashboard' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    example: 'votes',
    enum: ['updatedAt', 'votes', 'title', 'createdAt'],
  })
  @IsOptional()
  @IsIn(['updatedAt', 'votes', 'title', 'createdAt'])
  sortBy?: 'updatedAt' | 'votes' | 'title' | 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
