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
import { PlaygroundHypothesisStatus } from '../entities/playground-hypothesis-status.enum';

export class QueryPlaygroundHypothesesDto {
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

  @ApiPropertyOptional({
    enum: PlaygroundHypothesisStatus,
    example: PlaygroundHypothesisStatus.Open,
  })
  @IsOptional()
  @IsEnum(PlaygroundHypothesisStatus)
  status?: PlaygroundHypothesisStatus;

  @ApiPropertyOptional({ example: 'export flow' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  search?: string;
}
