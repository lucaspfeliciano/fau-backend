import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlaygroundInsightType } from '../entities/playground-insight-type.enum';

export class CreatePlaygroundInsightDto {
  @ApiProperty({
    example: 'Export modal overloads users with irrelevant options',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example:
      'Customers in discovery interviews repeatedly asked for a direct squad filter as first-class input.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  summary!: string;

  @ApiProperty({
    enum: PlaygroundInsightType,
    example: PlaygroundInsightType.PainPoint,
  })
  @IsEnum(PlaygroundInsightType)
  type!: PlaygroundInsightType;

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['asset-1', 'asset-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  evidenceAssetIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['hypothesis-1', 'hypothesis-2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  relatedHypothesisIds?: string[];

  @ApiPropertyOptional({
    example: {
      shapeType: 'rectangle',
      strokeColor: '#000000',
      fillColor: '#ffffff',
      strokeWidth: 2,
    },
    description:
      'Custom metadata for node types like shape (visual properties) and text',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
