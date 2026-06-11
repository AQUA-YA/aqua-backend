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
import { WaterTypesService } from './water-types.service';
import { CreateWaterTypeDto, UpdateWaterTypeDto } from './dto/water-type.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('water-types')
@ApiBearerAuth()
@Controller('water-types')
export class WaterTypesController {
  constructor(private readonly service: WaterTypesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear tipo de agua' })
  create(@Body() dto: CreateWaterTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tipos de agua' })
  findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de agua' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar tipo de agua' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateWaterTypeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar tipo de agua' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}
