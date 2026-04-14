import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlaygroundHypothesisStatus } from '../entities/playground-hypothesis-status.enum';

export class CreatePlaygroundHypothesisDto {
  @ApiProperty({
    example: 'SMB accounts abandon export flow due to missing squad filter.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  statement!: string;

  @ApiPropertyOptional({
    example: 'Signals from CS calls and support tickets in Q2.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: PlaygroundHypothesisStatus,
    example: PlaygroundHypothesisStatus.Open,
  })
  @IsOptional()
  @IsEnum(PlaygroundHypothesisStatus)
  status?: PlaygroundHypothesisStatus;

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number;

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
}