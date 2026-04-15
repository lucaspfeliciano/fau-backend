import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InitiativeStatus } from '../entities/initiative-status.enum';

export class UpdateInitiativeDto {
  @ApiPropertyOptional({ example: 'Melhorias de Analytics - Q2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    example:
      'Atualizacao da iniciativa com foco em UX de exportacao e segmentacao por squad.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['request-1', 'request-3'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  requestIds?: string[];

  @ApiPropertyOptional({
    enum: InitiativeStatus,
    example: InitiativeStatus.InProgress,
  })
  @IsOptional()
  @IsEnum(InitiativeStatus)
  status?: InitiativeStatus;

  @ApiPropertyOptional({ example: 'Dependencia de design system liberada.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(400)
  priorityNotes?: string;
}
