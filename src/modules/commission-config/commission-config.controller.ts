import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommissionConfigService } from './commission-config.service';
import { CreateCommissionConfigDto } from './dto/commission-config.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('commission-config')
@ApiBearerAuth()
@Controller('commission-config')
export class CommissionConfigController {
  constructor(private readonly service: CommissionConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Configuración de comisión vigente' })
  getCurrent() {
    return this.service.getCurrent();
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear/actualizar configuración de comisión' })
  create(
    @Body() dto: CreateCommissionConfigDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Get('history')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Historial de configuraciones' })
  findHistory(@Query() query: PaginationDto) {
    return this.service.findHistory(query);
  }
}
