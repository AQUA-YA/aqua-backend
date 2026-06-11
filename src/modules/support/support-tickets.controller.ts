import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  SupportTicketQueryDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/interfaces/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@ApiTags('support-tickets')
@ApiBearerAuth()
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear ticket de soporte' })
  create(@Body() dto: CreateSupportTicketDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mis tickets' })
  findMine(
    @Query() query: SupportTicketQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findMine(user.sub, query);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar tickets (admin)' })
  findAll(@Query() query: SupportTicketQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del ticket' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub, user.roles);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar ticket (admin)' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }
}
