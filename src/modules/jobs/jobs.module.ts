import { Module } from '@nestjs/common';
import { OrderTimeoutJob } from './order-timeout.job';
import { SubscriptionJob } from './subscription.job';
import { PointsExpirationJob } from './points-expiration.job';
import { OrdersModule } from '../orders/orders.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [OrdersModule, SubscriptionsModule, LoyaltyModule],
  providers: [OrderTimeoutJob, SubscriptionJob, PointsExpirationJob],
})
export class JobsModule {}
