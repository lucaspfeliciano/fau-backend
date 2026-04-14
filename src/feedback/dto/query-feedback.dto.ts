import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FeedbackSource } from '../entities/feedback-source.enum';

export class QueryFeedbackDto {
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
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: FeedbackSource, example: FeedbackSource.Slack })
  @IsOptional()
  @IsEnum(FeedbackSource)
  source?: FeedbackSource;

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
}
