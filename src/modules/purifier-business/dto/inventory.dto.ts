import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { InventoryMovementType } from '../../../common/interfaces/enums';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class InventoryItemDto {
  @IsString()
  bottleSizeId: string;

  @IsNumber()
  @Min(0)
  availableQuantity: number;

  @IsNumber()
  @Min(0)
  availableSeals: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  lowStockThreshold?: number;
}

export class CreateInventoryMovementDto {
  @IsString()
  bottleSizeId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seals?: number;

  @IsString()
  reason: string;
}

export class InventoryMovementQueryDto extends PaginationDto {}
