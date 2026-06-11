import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

@WebSocketGateway({ cors: { origin: '*', credentials: true } })
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        this.logger.warn(`Cliente ${client.id} sin token`);
        client.disconnect();
        return;
      }
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || '';
      const payload = jwt.verify(token, secret) as { sub: string };
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(
        `Cliente ${client.id} conectado como usuario ${payload.sub}`,
      );
    } catch {
      this.logger.warn(`Token inválido para cliente ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente ${client.id} desconectado`);
  }

  @SubscribeMessage('order.join')
  async handleOrderJoin(client: Socket, orderId: string) {
    const userId = client.data.userId;
    if (!userId) return;
    const isParticipant = await this.isOrderParticipant(orderId, userId);
    if (!isParticipant) return;
    client.join(`order:${orderId}`);
  }

  @SubscribeMessage('order.leave')
  handleOrderLeave(client: Socket, orderId: string) {
    client.leave(`order:${orderId}`);
  }

  @SubscribeMessage('order.location.update')
  async handleLocationUpdate(
    client: Socket,
    payload: { orderId: string; lat: number; lng: number },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const order = await this.fetchOrder(payload.orderId);
    if (!order) return;
    if (
      String(order.acceptedById) !== userId &&
      String(order.assignedDeliveryUserId) !== userId
    ) {
      return;
    }
    const DeliveryProfile = mongoose.model('DeliveryProfile');
    await DeliveryProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          currentLocation: {
            type: 'Point',
            coordinates: [payload.lng, payload.lat],
          },
        },
      },
    ).exec();
    this.server.to(`order:${payload.orderId}`).emit('order.location', {
      orderId: payload.orderId,
      lat: payload.lat,
      lng: payload.lng,
    });
  }

  @SubscribeMessage('chat.send')
  async handleChatSend(
    client: Socket,
    payload: { orderId: string; messageType: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const isParticipant = await this.isOrderParticipant(
      payload.orderId,
      userId,
    );
    if (!isParticipant) return;
    const order = await this.fetchOrder(payload.orderId);
    if (!order) return;
    const activeStatuses = [
      'pending',
      'accepted',
      'in_transit',
      'empty_pickup',
    ];
    if (!activeStatuses.includes(order.status)) return;

    const user = await mongoose.model('User').findById(userId).exec();
    const senderRole =
      user?.roles?.includes('delivery') || user?.roles?.includes('purifier')
        ? 'delivery'
        : 'consumer';

    const message = await mongoose.model('ChatMessage').create({
      orderId: payload.orderId,
      senderId: userId,
      senderRole,
      messageType: payload.messageType || 'text',
      content: payload.content,
    });

    this.server
      .to(`order:${payload.orderId}`)
      .emit('chat.message', message.toObject());
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToOrder(orderId: string, event: string, data: any) {
    this.server.to(`order:${orderId}`).emit(event, data);
  }

  private async isOrderParticipant(
    orderId: string,
    userId: string,
  ): Promise<boolean> {
    const order = await this.fetchOrder(orderId);
    if (!order) return false;
    return (
      String(order.consumerId) === userId ||
      String(order.acceptedById) === userId ||
      String(order.assignedDeliveryUserId) === userId
    );
  }

  private async fetchOrder(orderId: string): Promise<any> {
    try {
      return await mongoose.model('Order').findById(orderId).exec();
    } catch {
      return null;
    }
  }
}
