import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { TicketStatus } from '../../../common/interfaces/enums';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  adminResponse?: string;
}

export class SupportTicketQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;
}
