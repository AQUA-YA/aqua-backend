import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurifierBusinessService } from './purifier-business.service';
import { SalesReportQueryDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('purifiers')
@ApiBearerAuth()
@Controller('purifiers/:id/reports')
export class ReportsController {
  constructor(private readonly service: PurifierBusinessService) {}

  @Get('sales')
  @Roles(Role.PURIFIER, Role.ADMIN)
  @ApiOperation({ summary: 'Reporte de ventas (JSON o CSV)' })
  async getSalesReport(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: SalesReportQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const result = await this.service.getSalesReport(
      id,
      query,
      user.sub,
      user.roles,
    );

    if (query.format === 'csv') {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sales-report-${id}.csv"`,
      });
      return res.send(result.csv);
    }

    return res.json({ data: result.data, totals: result.totals });
  }
}
