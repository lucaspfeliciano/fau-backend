import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequestStatus } from '../entities/request-status.enum';

export class CreateRequestDto {
  @ApiProperty({ example: 'Exportar dashboard por squad' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example:
      'Clientes enterprise precisam filtrar por squad antes de exportar.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['feedback-1', 'feedback-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  feedbackIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['customer-1', 'customer-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  customerIds?: string[];

  @ApiProperty({
    type: [String],
    example: ['Usuarios nao conseguem comparar dashboards por squad.'],
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
    example: ['Adicionar filtro por squad no fluxo de exportacao.'],
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
}
