import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginationDto } from '../../common/interfaces/pagination.interface';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('orders/:id/messages')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener mensajes del pedido' })
  findAll(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: PaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(id, user.sub, user.roles, query);
  }

  @Post()
  @ApiOperation({ summary: 'Enviar mensaje al pedido' })
  create(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateChatMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(id, dto, user.sub, user.roles);
  }
}
