import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateLegacyPlaygroundNodeDto {
  @ApiPropertyOptional({
    example: 'solution',
    enum: PLAYGROUND_NODE_TYPES,
    description:
      'Tipo do node: note, problem, solution, insight, evidence, text, shape',
  })
  @IsOptional()
  @IsEnum(PlaygroundNodeType, {
    message: `type must be one of: ${PLAYGROUND_NODE_TYPES.join(', ')}`,
  })
  type?: string;

  @ApiPropertyOptional({ example: 'Export by squad should be first class' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    example: 'Follow-up sessions validated this need.',
    description:
      'Content is required for text nodes when updating type to text',
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
      importance: 60,
      isPinned: false,
    },
    description:
      'For shape nodes: must include shapeType, strokeColor, fillColor, strokeWidth',
  })
  @IsOptional()
  @IsObject()
  @IsValidShapeMetadata()
  metadata?: Record<string, unknown>;
}
