import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UploadPlaygroundAssetDto {
  @ApiPropertyOptional({ example: 'Pain point screenshot from onboarding flow' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  name?: string;
}
