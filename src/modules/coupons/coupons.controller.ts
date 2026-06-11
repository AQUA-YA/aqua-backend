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
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PURIFIER)
  @ApiOperation({ summary: 'Crear cupón' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub, user.roles);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar cupones (admin)' })
  findAll(@Query() query: CouponQueryDto) {
    return this.service.findAll(query);
  }

  @Get('mine')
  @Roles(Role.PURIFIER)
  @ApiOperation({ summary: 'Mis cupones' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.service.findMine(user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cupón' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub, user.roles);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cupón' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user.sub, user.roles);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validar cupón sin consumir' })
  validate(@Body() dto: ValidateCouponDto, @CurrentUser() user: JwtPayload) {
    return this.service.validate(dto, user.sub);
  }
}
