import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class DepositDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

export class WithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

export class WalletTransactionQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;
}
