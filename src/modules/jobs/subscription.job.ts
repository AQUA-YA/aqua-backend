import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionFrequency } from '../../common/interfaces/enums';

@Injectable()
export class SubscriptionJob {
  private readonly logger = new Logger(SubscriptionJob.name);

  constructor(
    @InjectModel('Subscription') private readonly subModel: Model<any>,
    @InjectModel('Order') private readonly orderModel: Model<any>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async generateOrders() {
    const now = new Date();
    const subs = await this.subModel
      .find({
        isActive: true,
        isPaused: false,
        nextOrderAt: { $lte: now },
        deletedAt: null,
      })
      .exec();

    for (const sub of subs) {
      try {
        const orderData: any = {
          consumerId: sub.userId,
          mode: sub.purifierId ? 'to_purifier' : 'open',
          waterTypeId: sub.waterTypeId,
          bottleSizeId: sub.bottleSizeId,
          quantity: sub.quantity,
          deliveryAddress: sub.deliveryAddress,
          paymentMethod: sub.paymentMethod,
          tip: 0,
          discount: 0,
          status: 'pending',
          subscriptionId: String(sub._id),
          notifiedTimeout: false,
        };

        if (sub.purifierId) {
          orderData.targetPurifierId = sub.purifierId;
        }

        const created = await this.orderModel.create(orderData);

        const frequency = sub.frequency;
        const lastGeneratedAt = new Date();
        const nextOrderAt = new Date(lastGeneratedAt);

        if (frequency === SubscriptionFrequency.WEEKLY) {
          nextOrderAt.setDate(nextOrderAt.getDate() + 7);
        } else if (frequency === SubscriptionFrequency.BIWEEKLY) {
          nextOrderAt.setDate(nextOrderAt.getDate() + 14);
        } else if (frequency === SubscriptionFrequency.MONTHLY) {
          nextOrderAt.setDate(nextOrderAt.getDate() + 28);
        }

        sub.lastGeneratedAt = lastGeneratedAt;
        sub.nextOrderAt = nextOrderAt;
        await sub.save();

        this.logger.log(
          `Pedido ${created._id} generado de suscripción ${sub._id}`,
        );
      } catch (err) {
        this.logger.error(
          `Error generando pedido de suscripción ${sub._id}: ${err}`,
        );
      }
    }
  }
}
