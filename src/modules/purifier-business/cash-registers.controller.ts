import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurifierBusinessService } from './purifier-business.service';
import {
  CreateCashRegisterDto,
  CreateCashEntryDto,
  CashRegisterQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('purifiers')
@ApiBearerAuth()
@Controller('purifiers/:id/cash-registers')
export class CashRegistersController {
  constructor(private readonly service: PurifierBusinessService) {}

  @Post()
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Abrir caja' })
  create(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateCashRegisterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCashRegister(id, dto, user.sub);
  }

  @Post(':registerId/entries')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Agregar entrada a caja' })
  createEntry(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('registerId', ParseObjectIdPipe) registerId: string,
    @Body() dto: CreateCashEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCashEntry(id, registerId, dto, user.sub);
  }

  @Post(':registerId/close')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Cerrar caja' })
  close(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('registerId', ParseObjectIdPipe) registerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.closeCashRegister(id, registerId, user.sub);
  }

  @Get()
  @Roles(Role.PURIFIER, Role.ADMIN)
  @ApiOperation({ summary: 'Historial de cajas' })
  findAll(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: CashRegisterQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findCashRegisters(id, query, user.sub, user.roles);
  }
}
