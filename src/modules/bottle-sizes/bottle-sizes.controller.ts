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
import { BottleSizesService } from './bottle-sizes.service';
import {
  CreateBottleSizeDto,
  UpdateBottleSizeDto,
} from './dto/bottle-size.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('bottle-sizes')
@ApiBearerAuth()
@Controller('bottle-sizes')
export class BottleSizesController {
  constructor(private readonly service: BottleSizesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear tamaño de garrafón' })
  create(@Body() dto: CreateBottleSizeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tamaños de garrafón' })
  findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tamaño de garrafón' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar tamaño de garrafón' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBottleSizeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar tamaño de garrafón' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}
