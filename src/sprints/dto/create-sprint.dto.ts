import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SprintStatus } from '../entities/sprint-status.enum';

export class CreateSprintDto {
  @ApiProperty({ example: 'initiative-1' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  initiativeId!: string;

  @ApiProperty({ example: 'Sprint 24' })
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: SprintStatus, example: SprintStatus.Planned })
  @IsEnum(SprintStatus)
  status!: SprintStatus;

  @ApiPropertyOptional({ example: '2026-05-15' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  eta?: string;

  @ApiPropertyOptional({ example: 'squad-growth' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  squad?: string;

  @ApiPropertyOptional({ example: 'linear-sprint-987' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  externalLinearSprintId?: string;
}
