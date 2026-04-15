import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLegacyPlaygroundNodeDto {
  @ApiProperty({ example: 'problem' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @ApiProperty({ example: 'Export by squad is hard to discover' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({
    example: 'Users reported confusion in interview calls.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
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
      importance: 70,
      isPinned: true,
      sortOrder: 2,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
