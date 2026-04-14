import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class QuerySprintsDto {
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

  @ApiPropertyOptional({ example: 'initiative-1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  initiativeId?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional({ example: 'squad-growth' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  squad?: string;

  @ApiPropertyOptional({ example: 'sprint 24' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  search?: string;
}
