import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateBottleSizeDto {
  @IsNumber()
  liters: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBottleSizeDto extends PartialType(CreateBottleSizeDto) {}
