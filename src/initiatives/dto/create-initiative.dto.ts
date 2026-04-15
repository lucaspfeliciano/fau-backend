import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateInitiativeDto {
  @ApiProperty({ example: 'Melhorias de Analytics' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example:
      'Iniciativa para consolidar demandas de exportacao e visao por squad no produto.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['request-1', 'request-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  requestIds?: string[];

  @ApiProperty({ enum: InitiativeStatus, example: InitiativeStatus.Planned })
  @IsEnum(InitiativeStatus)
  status!: InitiativeStatus;

  @ApiPropertyOptional({
    example: 'Priorizar squads enterprise no primeiro ciclo.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(400)
  priorityNotes?: string;
}
