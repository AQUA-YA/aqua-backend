import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SoftDeleteInterceptor } from './common/interceptors/soft-delete.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WaterTypesModule } from './modules/water-types/water-types.module';
import { BottleSizesModule } from './modules/bottle-sizes/bottle-sizes.module';
import { CommissionConfigModule } from './modules/commission-config/commission-config.module';
import { PurifiersModule } from './modules/purifiers/purifiers.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { PurifierBusinessModule } from './modules/purifier-business/purifier-business.module';
import { SupportModule } from './modules/support/support.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') || 60000,
          limit: config.get<number>('THROTTLE_LIMIT') || 100,
        },
      ],
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ProvidersModule,
    AuthModule,
    UsersModule,
    WaterTypesModule,
    BottleSizesModule,
    CommissionConfigModule,
    PurifiersModule,
    DeliveryModule,
    WalletsModule,
    OrdersModule,
    RealtimeModule,
    NotificationsModule,
    ChatModule,
    SubscriptionsModule,
    JobsModule,
    CouponsModule,
    ReferralsModule,
    LoyaltyModule,
    PurifierBusinessModule,
    SupportModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SoftDeleteInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
