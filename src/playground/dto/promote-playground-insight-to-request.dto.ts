import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequestStatus } from '../../requests/entities/request-status.enum';

export class PromotePlaygroundInsightToRequestDto {
  @ApiPropertyOptional({
    example: 'Exportar dashboard por squad',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    example:
      'Clientes enterprise precisam filtrar por squad antes de exportar.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: RequestStatus,
    example: RequestStatus.New,
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({
    type: [String],
    example: ['customer-1', 'customer-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  customerIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['company-1'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  companyIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['discovery', 'playground'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: 'Analytics',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  product?: string;

  @ApiPropertyOptional({
    example: 'Dashboard Export',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  functionality?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['hypothesis-1', 'hypothesis-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  hypothesisIds?: string[];

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeHypothesisStatements?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['Usuarios nao conseguem comparar dashboards por squad.'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(400, { each: true })
  problems?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Adicionar filtro por squad no fluxo de exportacao.'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(400, { each: true })
  solutions?: string[];
}