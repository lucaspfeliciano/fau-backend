import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequestStatus } from '../entities/request-status.enum';

export class PromoteFeedbackToRequestDto {
  @ApiPropertyOptional({ example: 'Exportar dashboard por squad' })
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

  @ApiProperty({
    type: [String],
    example: ['Times nao conseguem exportar por squad no formato atual.'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(400, { each: true })
  problems!: string[];

  @ApiProperty({
    type: [String],
    example: ['Adicionar filtro por squad no modal de exportacao.'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @MaxLength(400, { each: true })
  solutions!: string[];

  @ApiProperty({ example: 'Analytics' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  product!: string;

  @ApiProperty({ example: 'Dashboard Export' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  functionality!: string;

  @ApiPropertyOptional({ enum: RequestStatus, example: RequestStatus.New })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({ type: [String], example: ['customer-1'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  customerIds?: string[];

  @ApiPropertyOptional({ type: [String], example: ['company-1'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  companyIds?: string[];

  @ApiPropertyOptional({ type: [String], example: ['analytics', 'export'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'board-analytics' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  boardId?: string;
}
