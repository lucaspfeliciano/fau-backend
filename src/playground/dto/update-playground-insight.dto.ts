import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlaygroundInsightType } from '../entities/playground-insight-type.enum';

export class UpdatePlaygroundInsightDto {
  @ApiPropertyOptional({
    example: 'Export modal overloads users with irrelevant options',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    example:
      'Recent sessions confirm users do not discover the right export filters fast enough.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    enum: PlaygroundInsightType,
    example: PlaygroundInsightType.Opportunity,
  })
  @IsOptional()
  @IsEnum(PlaygroundInsightType)
  type?: PlaygroundInsightType;

  @ApiPropertyOptional({ example: 70, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['asset-3', 'asset-9'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  evidenceAssetIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['hypothesis-4'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  relatedHypothesisIds?: string[];
}
