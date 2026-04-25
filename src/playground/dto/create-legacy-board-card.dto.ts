import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateLegacyBoardCardDto {
  @ApiProperty({ example: 'Export flow is missing squad filter' })
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  title!: string;

  @ApiPropertyOptional({ example: 'Customers lose access to export when squad is not selected.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    example: 'could_have',
    enum: BOARD_COLUMNS,
  })
  @IsOptional()
  @IsIn(BOARD_COLUMNS)
  column?: BoardCardColumn;

  @ApiPropertyOptional({ example: 'node-uuid-here' })
  @IsOptional()
  @IsString()
  sourceNodeId?: string;

  @ApiPropertyOptional({ example: 'note' })
  @IsOptional()
  @IsString()
  sourceNodeType?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
