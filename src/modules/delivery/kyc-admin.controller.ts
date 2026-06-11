import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { AdminReviewKycDto } from './dto/delivery.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('kyc-verifications')
@ApiBearerAuth()
@Controller('kyc-verifications')
export class KycAdminController {
  constructor(private readonly service: DeliveryService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar verificaciones KYC' })
  findAll(@Query() query: PaginationDto & { status?: string }) {
    return this.service.listKycVerifications(query);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revisar verificación KYC' })
  review(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminReviewKycDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reviewKyc(id, dto, user.sub);
  }
}
