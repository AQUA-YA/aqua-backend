import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StoreSalePaymentMethod } from '../../../common/interfaces/enums';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class CreateStoreSaleDto {
  @IsString()
  waterTypeId: string;

  @IsString()
  bottleSizeId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsEnum(StoreSalePaymentMethod)
  paymentMethod: StoreSalePaymentMethod;
}

export class StoreSaleQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;
}
