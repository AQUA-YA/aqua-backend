import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionFrequency,
  PaymentMethod,
} from '../../../common/interfaces/enums';

class AddressCoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

class DeliveryAddressDto {
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
  isPrimary?: boolean;
}

export class CreateSubscriptionDto {
  @IsOptional()
  @IsString()
  purifierId?: string;

  @IsString()
  waterTypeId: string;

  @IsString()
  bottleSizeId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  hour?: string;

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: string;
}
