import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateLegacyPlaygroundNodeDto {
  @ApiPropertyOptional({ example: 'opportunity' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type?: string;

  @ApiPropertyOptional({ example: 'Export by squad should be first class' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({ example: 'Follow-up sessions validated this need.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ example: 'asset-1' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  linkedAssetId?: string;

  @ApiPropertyOptional({
    example: {
      importance: 60,
      isPinned: false,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
