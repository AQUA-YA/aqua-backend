import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderMode, PaymentMethod } from '../../../common/interfaces/enums';

export class AddressCoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class DeliveryAddressDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsString()
  street: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @ValidateNested()
  @Type(() => AddressCoordinatesDto)
  location?: AddressCoordinatesDto;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateOrderDto {
  @IsEnum(OrderMode)
  mode: OrderMode;

  @IsOptional()
  @IsString()
  targetPurifierId?: string;

  @IsOptional()
  @IsString()
  targetDeliveryUserId?: string;

  @IsString()
  waterTypeId: string;

  @IsString()
  bottleSizeId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  redeemPoints?: number;

  @IsOptional()
  @IsBoolean()
  requiresEmptyPickup?: boolean;
}
