import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsArray,
  IsNotEmpty,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeliveryProfileDto {
  @IsOptional()
  @IsBoolean()
  hasOwnInventory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;
}

export class UpdateAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;
}

export class DeliveryInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  waterTypeId: string;

  @IsString()
  @IsNotEmpty()
  bottleSizeId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class UpsertInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryInventoryItemDto)
  items: DeliveryInventoryItemDto[];
}

export class DeliveryPriceItemDto {
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

export class UpsertDeliveryPricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryPriceItemDto)
  items: DeliveryPriceItemDto[];
}

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  idPhoto: string;

  @IsString()
  @IsNotEmpty()
  selfie: string;
}

export class VerifyQrDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;
}

export class AdminReviewKycDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  status: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
