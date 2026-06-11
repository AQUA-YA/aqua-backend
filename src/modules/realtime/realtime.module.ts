import { Module } from '@nestjs/common';
import { EventsGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  providers: [EventsGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
