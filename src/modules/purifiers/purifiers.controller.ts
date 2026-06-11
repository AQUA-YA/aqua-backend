import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurifiersService } from './purifiers.service';
import {
  CreatePurifierDto,
  UpdatePurifierDto,
  NearbyQueryDto,
  UpsertPricesDto,
  CreateRatingDto,
  CreateDeliveryLinkDto,
  UpdateDeliveryLinkDto,
} from './dto/purifier.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('purifiers')
@ApiBearerAuth()
@Controller('purifiers')
export class PurifiersController {
  constructor(private readonly service: PurifiersService) {}

  @Post()
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Crear purificadora' })
  create(@Body() dto: CreatePurifierDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get('mine')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Mis purificadoras' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Purificadoras cercanas' })
  findNearby(@Query() query: NearbyQueryDto) {
    return this.service.findNearby(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de purificadora' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar purificadora' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePurifierDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub, user.roles);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar purificadora' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user.sub, user.roles);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Listar precios de purificadora' })
  findPrices(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findPrices(id);
  }

  @Put(':id/prices')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Actualizar precios (bulk upsert)' })
  upsertPrices(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpsertPricesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertPrices(id, dto.prices, user.sub);
  }

  @Post(':id/ratings')
  @Roles(Role.CONSUMER)
  @ApiOperation({ summary: 'Calificar purificadora' })
  createRating(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateRatingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createRating(id, dto, user.sub);
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'Calificaciones de purificadora' })
  findRatings(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.findRatings(id, query);
  }

  @Post(':id/delivery-links')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Vincular repartidor' })
  createDeliveryLink(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateDeliveryLinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createDeliveryLink(id, dto, user.sub);
  }

  @Get(':id/delivery-links')
  @ApiOperation({ summary: 'Vínculos de repartidores' })
  findDeliveryLinks(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findDeliveryLinks(id, user.sub, user.roles);
  }

  @Patch(':id/delivery-links/:linkId')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Actualizar vínculo de repartidor' })
  updateDeliveryLink(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('linkId', ParseObjectIdPipe) linkId: string,
    @Body() dto: UpdateDeliveryLinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateDeliveryLink(id, linkId, dto, user.sub);
  }

  @Delete(':id/delivery-links/:linkId')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Eliminar vínculo de repartidor' })
  removeDeliveryLink(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('linkId', ParseObjectIdPipe) linkId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeDeliveryLink(id, linkId, user.sub);
  }
}
