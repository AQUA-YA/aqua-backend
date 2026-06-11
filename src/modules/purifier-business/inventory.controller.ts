import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurifierBusinessService } from './purifier-business.service';
import {
  InventoryItemDto,
  CreateInventoryMovementDto,
  InventoryMovementQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('purifiers')
@ApiBearerAuth()
@Controller('purifiers/:id/inventory')
export class InventoryController {
  constructor(private readonly service: PurifierBusinessService) {}

  @Get()
  @Roles(Role.PURIFIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtener inventario de la purificadora' })
  getInventory(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getInventory(id, user.sub, user.roles);
  }

  @Put()
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Actualizar inventario (bulk upsert)' })
  updateInventory(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: InventoryItemDto[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateInventory(id, dto, user.sub);
  }

  @Post('movements')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Crear movimiento de inventario' })
  createMovement(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMovement(id, dto, user.sub);
  }

  @Get('movements')
  @Roles(Role.PURIFIER, Role.ADMIN)
  @ApiOperation({ summary: 'Historial de movimientos' })
  findMovements(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: InventoryMovementQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findMovements(id, query, user.sub, user.roles);
  }
}
