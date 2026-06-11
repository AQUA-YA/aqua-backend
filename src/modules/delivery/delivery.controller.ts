import { Controller, Get, Post, Patch, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import {
  UpdateDeliveryProfileDto,
  UpdateAvailabilityDto,
  UpsertInventoryDto,
  UpsertDeliveryPricesDto,
  SubmitKycDto,
  VerifyQrDto,
} from './dto/delivery.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  @Get('me/profile')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Mi perfil de repartidor' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.service.getProfile(user.sub);
  }

  @Patch('me/profile')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Actualizar perfil' })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDeliveryProfileDto,
  ) {
    return this.service.updateProfile(user.sub, dto);
  }

  @Patch('me/availability')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Cambiar disponibilidad' })
  updateAvailability(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.service.updateAvailability(user.sub, dto);
  }

  @Get('me/inventory')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Mi inventario' })
  getInventory(@CurrentUser() user: JwtPayload) {
    return this.service.getInventory(user.sub);
  }

  @Put('me/inventory')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Actualizar inventario (bulk upsert)' })
  upsertInventory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertInventoryDto,
  ) {
    return this.service.upsertInventory(user.sub, dto.items);
  }

  @Get('me/prices')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Mis precios' })
  getPrices(@CurrentUser() user: JwtPayload) {
    return this.service.getPrices(user.sub);
  }

  @Put('me/prices')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Actualizar precios (bulk upsert)' })
  upsertPrices(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertDeliveryPricesDto,
  ) {
    return this.service.upsertPrices(user.sub, dto.items);
  }

  @Post('me/kyc')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Enviar documentos KYC' })
  submitKyc(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.service.submitKyc(user.sub, dto);
  }

  @Get('me/kyc')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Estado de verificación KYC' })
  getKycStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getKycStatus(user.sub);
  }

  @Get('me/qr')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Obtener código QR' })
  getQrToken(@CurrentUser() user: JwtPayload) {
    return this.service.getQrToken(user.sub);
  }

  @Post('verify-qr')
  @Public()
  @ApiOperation({ summary: 'Verificar código QR de repartidor' })
  verifyQr(@Body() dto: VerifyQrDto) {
    return this.service.verifyQr(dto.qrToken);
  }

  @Get('me/deliveries')
  @Roles(Role.DELIVERY)
  @ApiOperation({ summary: 'Historial de entregas' })
  getDeliveries(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationDto,
  ) {
    return this.service.getDeliveries(user.sub, query);
  }
}
