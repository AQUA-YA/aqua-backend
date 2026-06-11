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
import { LoyaltyService } from './loyalty.service';
import {
  CreateLoyaltyEventDto,
  UpdateLoyaltyEventDto,
  LoyaltyEventQueryDto,
  LoyaltyEntryQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mi saldo y movimientos de lealtad' })
  async getMe(
    @Query() query: LoyaltyEntryQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const [balance, entries] = await Promise.all([
      this.service.getBalance(user.sub),
      this.service.getEntries(user.sub, query),
    ]);
    return { ...balance, entries };
  }

  @Post('events')
  @Roles(Role.ADMIN, Role.PURIFIER)
  @ApiOperation({ summary: 'Crear evento de lealtad' })
  createEvent(
    @Body() dto: CreateLoyaltyEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createEvent(dto, user.sub, user.roles);
  }

  @Get('events')
  @ApiOperation({ summary: 'Listar eventos de lealtad' })
  findAllEvents(@Query() query: LoyaltyEventQueryDto) {
    return this.service.findAllEvents(query);
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Actualizar evento de lealtad' })
  updateEvent(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateLoyaltyEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateEvent(id, dto, user.sub, user.roles);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Eliminar evento de lealtad' })
  removeEvent(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeEvent(id, user.sub, user.roles);
  }
}
