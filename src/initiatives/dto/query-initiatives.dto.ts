import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { InitiativeStatus } from '../entities/initiative-status.enum';

export class QueryInitiativesDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: InitiativeStatus,
    example: InitiativeStatus.Planned,
  })
  @IsOptional()
  @IsEnum(InitiativeStatus)
  status?: InitiativeStatus;

  @ApiPropertyOptional({ example: 'analytics' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  search?: string;
}
