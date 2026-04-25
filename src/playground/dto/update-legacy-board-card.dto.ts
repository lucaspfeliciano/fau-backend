import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const BOARD_COLUMNS = [
  'must_have',
  'could_have',
  'nice_to_have',
  'wont_do',
] as const;

export type BoardCardColumn = (typeof BOARD_COLUMNS)[number];

export class UpdateLegacyBoardCardDto {
  @ApiPropertyOptional({ example: 'Export flow is missing squad filter' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    example: 'must_have',
    enum: BOARD_COLUMNS,
  })
  @IsOptional()
  @IsIn(BOARD_COLUMNS)
  column?: BoardCardColumn;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
