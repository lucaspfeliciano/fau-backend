import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdatePlaygroundHypothesisDto {
  @ApiPropertyOptional({
    example: 'SMB accounts abandon export flow due to missing squad filter.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  statement?: string;

  @ApiPropertyOptional({
    example: 'New CS interviews reinforced this behavior in onboarding.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: PlaygroundHypothesisStatus,
    example: PlaygroundHypothesisStatus.Validating,
  })
  @IsOptional()
  @IsEnum(PlaygroundHypothesisStatus)
  status?: PlaygroundHypothesisStatus;

  @ApiPropertyOptional({
    example: 65,
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
    example: ['asset-3', 'asset-9'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  evidenceAssetIds?: string[];
}
