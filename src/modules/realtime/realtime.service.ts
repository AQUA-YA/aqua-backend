import { Injectable } from '@nestjs/common';
import { EventsGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToUser(userId: string, event: string, data: any) {
    this.gateway.emitToUser(userId, event, data);
  }

  emitToOrder(orderId: string, event: string, data: any) {
    this.gateway.emitToOrder(orderId, event, data);
  }
}
