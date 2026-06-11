import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesReportQueryDto {
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  period?: string = 'daily';

  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;

  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: string = 'json';
}
