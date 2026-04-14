import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FeedbackSource } from '../entities/feedback-source.enum';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Erro ao compartilhar dashboard' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example:
      'Ao clicar em compartilhar, o modal fecha e nada acontece para os clientes externos.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ enum: FeedbackSource, example: FeedbackSource.Manual })
  @IsEnum(FeedbackSource)
  source!: FeedbackSource;

  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  publicSubmitterName?: string;

  @ApiPropertyOptional({ example: 'maria@empresa.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  publicSubmitterEmail?: string;

  @ApiPropertyOptional({ example: 'customer-123' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerId?: string;
}
