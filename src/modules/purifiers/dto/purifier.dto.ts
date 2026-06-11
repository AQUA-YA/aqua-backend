import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePurifierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waterTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bottleSizeIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;
}

export class UpdatePurifierDto extends PartialType(CreatePurifierDto) {}

export class NearbyQueryDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  waterTypeId?: string;

  @IsOptional()
  @IsString()
  bottleSizeId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class PurifierPriceItemDto {
  @IsString()
  @IsNotEmpty()
  waterTypeId: string;

  @IsString()
  @IsNotEmpty()
  bottleSizeId: string;

  @IsNumber()
  @Min(0.01)
  price: number;
}

export class UpsertPricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurifierPriceItemDto)
  prices: PurifierPriceItemDto[];
}

export class CreateRatingDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateDeliveryLinkDto {
  @IsString()
  @IsNotEmpty()
  deliveryUserId: string;

  @IsOptional()
  @IsString()
  shift?: string;
}

export class UpdateDeliveryLinkDto {
  @IsOptional()
  @IsString()
  shift?: string;
}
