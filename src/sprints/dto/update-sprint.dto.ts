import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SprintStatus } from '../entities/sprint-status.enum';

export class UpdateSprintDto {
  @ApiPropertyOptional({ example: 'initiative-2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  initiativeId?: string;

  @ApiPropertyOptional({ example: 'Sprint 24 - Ajustada' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional({
    enum: SprintStatus,
    example: SprintStatus.InProgress,
  })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;

  @ApiPropertyOptional({ example: '2026-05-20' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  eta?: string;

  @ApiPropertyOptional({ example: 'squad-platform' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  squad?: string;

  @ApiPropertyOptional({ example: 'linear-sprint-999' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  externalLinearSprintId?: string;
}
