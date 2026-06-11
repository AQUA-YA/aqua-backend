import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  AssignDeliveryDto,
  DeliverOrderDto,
  CancelOrderDto,
  AvailableOrdersQueryDto,
  MyOrdersQueryDto,
  AssignedOrdersQueryDto,
  AdminOrdersQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Crear pedido' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get('available')
  @Roles(Role.PURIFIER, Role.DELIVERY)
  @ApiOperation({ summary: 'Pedidos disponibles cercanos' })
  findAvailable(
    @Query() query: AvailableOrdersQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAvailable(user.sub, query);
  }

  @Post(':id/accept')
  @Roles(Role.PURIFIER, Role.DELIVERY)
  @ApiOperation({ summary: 'Aceptar pedido (first-accept atómico)' })
  accept(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.accept(id, user.sub, user.roles);
  }

  @Post(':id/assign')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Asignar repartidor' })
  assign(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignDeliveryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.assign(id, dto.deliveryUserId, user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto.status, user.sub, user.roles);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Entregar pedido + settlement' })
  deliver(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: DeliverOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deliver(id, dto, user.sub, user.roles);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pedido' })
  cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cancel(id, dto, user.sub, user.roles);
  }

  @Get('mine')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Mis pedidos' })
  findMine(@Query() query: MyOrdersQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub, query);
  }

  @Get('assigned')
  @Roles(Role.PURIFIER, Role.DELIVERY)
  @ApiOperation({ summary: 'Pedidos asignados' })
  findAssigned(
    @Query() query: AssignedOrdersQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAssigned(user.sub, query);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Todos los pedidos (admin)' })
  findAll(@Query() query: AdminOrdersQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del pedido + historial' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub, user.roles);
  }
}
