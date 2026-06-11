import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, Role } from '../../../common/interfaces/enums';
import { PaginationDto } from '../../../common/interfaces/pagination.interface';

export class AddressDto {
  @ApiProperty()
  @IsString()
  alias: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  location?: { type: string; coordinates: number[] };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false, enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class UpdateAvatarDto {
  @ApiProperty()
  @IsString()
  file: string;
}

export class UsersQueryDto extends PaginationDto {
  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: string;
}

export class AdminUpdateUserDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;
}
