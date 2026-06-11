import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  healthCheck() {
    return { data: { status: 'ok' }, message: 'AquaYa API funcionando' };
  }
}
