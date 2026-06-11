import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateWaterTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWaterTypeDto extends PartialType(CreateWaterTypeDto) {}
