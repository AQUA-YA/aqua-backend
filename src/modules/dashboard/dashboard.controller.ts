import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/enums';
import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class DashboardQueryDto {
  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('metrics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Métricas del dashboard (admin)' })
  getMetrics(@Query() query: DashboardQueryDto) {
    return this.service.getMetrics(
      query.from?.toISOString(),
      query.to?.toISOString(),
    );
  }

  @Get('heatmap')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Datos para mapa de calor (admin)' })
  getHeatmap(@Query() query: DashboardQueryDto) {
    return this.service.getHeatmap(
      query.from?.toISOString(),
      query.to?.toISOString(),
    );
  }
}
