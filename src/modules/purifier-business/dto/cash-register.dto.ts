import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { CashEntryType } from '../../../common/interfaces/enums';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class CreateCashRegisterDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsNumber()
  @Min(0)
  openingBalance: number;
}

export class CreateCashEntryDto {
  @IsEnum(CashEntryType)
  type: CashEntryType;

  @IsString()
  concept: string;

  @IsNumber()
  amount: number;
}

export class CashRegisterQueryDto extends PaginationDto {}
