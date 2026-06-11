import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurifierBusinessService } from './purifier-business.service';
import { CreateStoreSaleDto, StoreSaleQueryDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('purifiers')
@ApiBearerAuth()
@Controller('purifiers/:id/store-sales')
export class StoreSalesController {
  constructor(private readonly service: PurifierBusinessService) {}

  @Post()
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Crear venta en local (POS)' })
  create(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateStoreSaleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createStoreSale(id, dto, user.sub);
  }

  @Get()
  @Roles(Role.PURIFIER, Role.ADMIN)
  @ApiOperation({ summary: 'Listar ventas en local' })
  findAll(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: StoreSaleQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findStoreSales(id, query, user.sub, user.roles);
  }
}
