import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { PUSH_PROVIDER } from '../../providers/providers.module';
import type { PushProvider } from '../../providers/providers.module';
import { OrderStatus } from '../../common/interfaces/enums';
import { ORDER_ACCEPT_TIMEOUT_MIN } from '../../common/constants/business.constants';

@Injectable()
export class OrderTimeoutJob {
  private readonly logger = new Logger(OrderTimeoutJob.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTimeout() {
    const cutoff = new Date(Date.now() - ORDER_ACCEPT_TIMEOUT_MIN * 60000);
    const orders = await this.orderModel
      .find({
        status: OrderStatus.PENDING,
        createdAt: { $lt: cutoff },
        notifiedTimeout: false,
        deletedAt: null,
      })
      .exec();

    for (const order of orders) {
      try {
        const consumerId = String(order.consumerId);
        const NotificationToken = mongoose.model('NotificationToken');
        const tokens = await NotificationToken.find({
          userId: consumerId,
          isActive: true,
        }).exec();
        if (tokens.length > 0) {
          await this.pushProvider.send(
            tokens.map((t: any) => t.token),
            'Pedido sin aceptar',
            'Tu pedido aún no ha sido aceptado',
            { orderId: String(order._id) },
          );
        }
        order.notifiedTimeout = true;
        await order.save();
        this.logger.log(`Timeout notificado para pedido ${order._id}`);
      } catch (err) {
        this.logger.error(
          `Error notificando timeout pedido ${order._id}: ${err}`,
        );
      }
    }
  }
}
