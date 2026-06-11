import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Crear suscripción' })
  create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get('mine')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Mis suscripciones' })
  findMine(@Query() query: PaginationDto, @CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub, query);
  }

  @Get(':id')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Detalle de suscripción' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub);
  }

  @Patch(':id')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Actualizar suscripción' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Post(':id/pause')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Pausar suscripción' })
  pause(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.pause(id, user.sub);
  }

  @Post(':id/resume')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Reanudar suscripción' })
  resume(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resume(id, user.sub);
  }

  @Delete(':id')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Cancelar suscripción' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user.sub);
  }

  @Get(':id/orders')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Pedidos generados por la suscripción' })
  findOrders(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOrders(id, user.sub, query);
  }
}
