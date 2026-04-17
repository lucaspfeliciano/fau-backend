import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PlaygroundNodeType,
  PLAYGROUND_NODE_TYPES,
} from '../entities/playground-node-type.enum';
import {
  IsValidTextNode,
  IsValidShapeMetadata,
} from './playground-node.validators';

export class CreateLegacyPlaygroundNodeDto {
  @ApiProperty({
    example: 'problem',
    enum: PLAYGROUND_NODE_TYPES,
    description:
      'Tipo do node: note, problem, solution, insight, evidence, text, shape',
  })
  @IsEnum(PlaygroundNodeType, {
    message: `type must be one of: ${PLAYGROUND_NODE_TYPES.join(', ')}`,
  })
  type!: string;

  @ApiProperty({ example: 'Export by squad is hard to discover' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({
    example: 'Users reported confusion in interview calls.',
    description:
      'Content is required for text nodes, optional for others. Max 2000 chars for structured nodes, 10000 for text nodes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @IsValidTextNode()
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
    description:
      'For shape nodes: must include shapeType ("rectangle"|"circle"), strokeColor (hex), fillColor (hex|transparent), strokeWidth (1-10)',
  })
  @IsOptional()
  @IsObject()
  @IsValidShapeMetadata()
  metadata?: Record<string, unknown>;
}
