import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';

@Injectable()
export class DashboardService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async getMetrics(from?: string, to?: string): Promise<any> {
    const userModel = this.connection.model('User');
    const orderModel = this.connection.model('Order');
    const referralModel = this.connection.model('Referral');
    const loyaltyEntryModel = this.connection.model('LoyaltyEntry');
    const subscriptionModel = this.connection.model('Subscription');

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Users
    const total = await userModel
      .countDocuments({ ...softDeleteCondition(false) })
      .exec();
    const newToday = await userModel
      .countDocuments({
        createdAt: { $gte: todayStart },
        ...softDeleteCondition(false),
      })
      .exec();
    const newWeek = await userModel
      .countDocuments({
        createdAt: { $gte: weekStart },
        ...softDeleteCondition(false),
      })
      .exec();
    const newMonth = await userModel
      .countDocuments({
        createdAt: { $gte: monthStart },
        ...softDeleteCondition(false),
      })
      .exec();

    // Orders by day
    const orderMatch: any = { ...softDeleteCondition(false), deletedAt: null };
    if (Object.keys(dateFilter).length) orderMatch.createdAt = dateFilter;
    const ordersByDay = await orderModel
      .aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const ordersToday = await orderModel
      .countDocuments({
        createdAt: { $gte: todayStart },
        ...softDeleteCondition(false),
      })
      .exec();
    const ordersWeek = await orderModel
      .countDocuments({
        createdAt: { $gte: weekStart },
        ...softDeleteCondition(false),
      })
      .exec();
    const ordersMonth = await orderModel
      .countDocuments({
        createdAt: { $gte: monthStart },
        ...softDeleteCondition(false),
      })
      .exec();

    // Revenue
    const deliveredFilter: any = {
      status: 'delivered',
      ...softDeleteCondition(false),
    };
    if (Object.keys(dateFilter).length) deliveredFilter.createdAt = dateFilter;
    const revenueAgg = await orderModel
      .aggregate([
        { $match: deliveredFilter },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            commissions: { $sum: '$commissionAmount' },
          },
        },
      ])
      .exec();
    const revenue =
      revenueAgg.length > 0
        ? {
            total: revenueAgg[0].total || 0,
            commissions: revenueAgg[0].commissions || 0,
          }
        : { total: 0, commissions: 0 };

    // Top water types
    const topWaterTypes = await orderModel
      .aggregate([
        { $match: { status: 'delivered', ...softDeleteCondition(false) } },
        { $group: { _id: '$waterTypeId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .exec();

    // Top purifiers
    const topPurifiers = await orderModel
      .aggregate([
        { $match: { status: 'delivered', ...softDeleteCondition(false) } },
        { $group: { _id: '$fulfillingPurifierId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .exec();

    // Top delivery users
    const topDeliveryUsers = await orderModel
      .aggregate([
        { $match: { status: 'delivered', ...softDeleteCondition(false) } },
        { $group: { _id: '$acceptedById', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .exec();

    // Referrals
    const invited = await referralModel
      .countDocuments({ ...softDeleteCondition(false) })
      .exec();
    const converted = await referralModel
      .countDocuments({
        firstOrderCompleted: true,
        ...softDeleteCondition(false),
      })
      .exec();
    const conversionRate =
      invited > 0 ? +((converted / invited) * 100).toFixed(2) : 0;

    // Loyalty
    const pointsIssuedAgg = await loyaltyEntryModel
      .aggregate([
        {
          $match: {
            type: { $in: ['earn', 'bonus'] },
            ...softDeleteCondition(false),
          },
        },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ])
      .exec();
    const pointsRedeemedAgg = await loyaltyEntryModel
      .aggregate([
        { $match: { type: 'redeem', ...softDeleteCondition(false) } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ])
      .exec();
    const pointsIssued =
      pointsIssuedAgg.length > 0 ? pointsIssuedAgg[0].total : 0;
    const pointsRedeemed =
      pointsRedeemedAgg.length > 0 ? pointsRedeemedAgg[0].total : 0;

    // Subscriptions
    const activeSubscriptions = await subscriptionModel
      .countDocuments({ isActive: true, ...softDeleteCondition(false) })
      .exec();

    return {
      users: { total, newToday, newWeek, newMonth },
      orders: {
        today: ordersToday,
        week: ordersWeek,
        month: ordersMonth,
        byDay: ordersByDay.map((o: any) => ({ date: o._id, count: o.count })),
      },
      revenue,
      topWaterTypes,
      topPurifiers,
      topDeliveryUsers,
      referrals: { invited, converted, conversionRate },
      loyalty: { pointsIssued, pointsRedeemed },
      subscriptions: { active: activeSubscriptions },
    };
  }

  async getHeatmap(from?: string, to?: string): Promise<any[]> {
    const orderModel = this.connection.model('Order');

    const match: any = { status: 'delivered', ...softDeleteCondition(false) };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const results = await orderModel
      .aggregate([
        { $match: match },
        { $project: { location: '$deliveryAddress.location' } },
        {
          $match: {
            'location.type': 'Point',
            'location.coordinates': { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              lat: {
                $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 3],
              },
              lng: {
                $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 3],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .exec();

    return results.map((r: any) => ({
      lat: r._id.lat,
      lng: r._id.lng,
      count: r.count,
    }));
  }
}
