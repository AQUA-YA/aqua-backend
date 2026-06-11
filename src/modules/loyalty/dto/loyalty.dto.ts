import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class CreateLoyaltyEventDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  multiplier: number;

  @IsOptional()
  @IsString()
  waterTypeId?: string;

  @IsOptional()
  @IsString()
  purifierId?: string;

  @Type(() => Date)
  startsAt: Date;

  @Type(() => Date)
  endsAt: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLoyaltyEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  multiplier?: number;

  @IsOptional()
  @IsString()
  waterTypeId?: string;

  @IsOptional()
  @IsString()
  purifierId?: string;

  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  endsAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LoyaltyEventQueryDto extends PaginationDto {}

export class LoyaltyEntryQueryDto extends PaginationDto {}
