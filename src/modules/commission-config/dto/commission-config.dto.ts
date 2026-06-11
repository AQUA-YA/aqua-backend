import { IsEnum, IsNumber, Min, Max } from 'class-validator';
import { CommissionType } from '../../../common/interfaces/enums';

export class CreateCommissionConfigDto {
  @IsEnum(CommissionType)
  type: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  value: number;
}
