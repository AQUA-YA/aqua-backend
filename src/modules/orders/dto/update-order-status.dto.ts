import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class UpdateOrderStatusDto {
  @IsString()
  status: string;
}

export class AssignDeliveryDto {
  @IsString()
  deliveryUserId: string;
}

export class DeliverOrderDto {
  @IsOptional()
  @IsBoolean()
  emptyBottleReturned?: boolean;
}

export class CancelOrderDto {
  @IsString()
  reason: string;
}

export class AvailableOrdersQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radiusKm?: number;
}

export class MyOrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class AssignedOrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminOrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  format?: string;
}
