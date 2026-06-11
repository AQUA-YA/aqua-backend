import { Controller, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

class UpsertTokenDto {
  token: string;
  platform: 'ios' | 'android';
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('tokens')
  @ApiOperation({ summary: 'Registrar token de notificación' })
  upsertToken(@Body() dto: UpsertTokenDto, @CurrentUser() user: JwtPayload) {
    return this.service.upsertToken(user.sub, dto.token, dto.platform);
  }

  @Delete('tokens/:token')
  @ApiOperation({ summary: 'Eliminar token de notificación' })
  removeToken(@Param('token') token: string) {
    return this.service.removeToken(token);
  }
}
