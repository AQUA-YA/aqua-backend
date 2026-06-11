import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Subscription } from './schemas/subscription.schema';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { SubscriptionFrequency } from '../../common/interfaces/enums';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subModel: Model<Subscription>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: CreateSubscriptionDto, userId: string) {
    const nextOrderAt = this.calculateNextOrderAt(
      dto.frequency,
      dto.dayOfWeek,
      dto.hour,
    );
    const deliveryAddress = dto.deliveryAddress
      ? {
          ...dto.deliveryAddress,
          location: dto.deliveryAddress.location
            ? {
                type: 'Point' as const,
                coordinates: [
                  dto.deliveryAddress.location.lng,
                  dto.deliveryAddress.location.lat,
                ],
              }
            : undefined,
        }
      : undefined;
    return this.subModel.create({
      userId,
      purifierId: dto.purifierId,
      waterTypeId: dto.waterTypeId,
      bottleSizeId: dto.bottleSizeId,
      quantity: dto.quantity,
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      hour: dto.hour,
      deliveryAddress,
      paymentMethod: dto.paymentMethod ?? 'cash',
      nextOrderAt,
    });
  }

  async findMine(
    userId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<Subscription>> {
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { userId, ...softDeleteCondition(false) };

    const [data, total] = await Promise.all([
      this.subModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.subModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const sub = await this.subModel.findById(id).exec();
    if (!sub || (sub as any).deletedAt) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    if (String(sub.userId) !== userId) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto, userId: string) {
    const sub = await this.subModel.findById(id).exec();
    if (!sub || (sub as any).deletedAt) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    if (String(sub.userId) !== userId) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    Object.assign(sub, dto);

    if (dto.frequency || dto.dayOfWeek || dto.hour) {
      sub.nextOrderAt = this.calculateNextOrderAt(
        dto.frequency ?? sub.frequency,
        dto.dayOfWeek ?? sub.dayOfWeek,
        dto.hour ?? sub.hour,
      );
    }

    return sub.save();
  }

  async pause(id: string, userId: string) {
    return this.updateField(id, userId, { isPaused: true });
  }

  async resume(id: string, userId: string) {
    return this.updateField(id, userId, { isPaused: false });
  }

  async remove(id: string, userId: string) {
    const sub = await this.subModel.findById(id).exec();
    if (!sub || (sub as any).deletedAt) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    if (String(sub.userId) !== userId) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    (sub as any).deletedAt = new Date();
    sub.isActive = false;
    return sub.save();
  }

  async findOrders(
    id: string,
    userId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    await this.findOne(id, userId);
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { subscriptionId: id, ...softDeleteCondition(false) };
    const OrderModel = this.getOrderModel();

    const [data, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      OrderModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  private async updateField(
    id: string,
    userId: string,
    fields: Record<string, any>,
  ) {
    const sub = await this.subModel.findById(id).exec();
    if (!sub || (sub as any).deletedAt) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    if (String(sub.userId) !== userId) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    Object.assign(sub, fields);
    return sub.save();
  }

  calculateNextOrderAt(
    frequency: string,
    dayOfWeek?: number,
    hour?: string,
  ): Date {
    const now = new Date();
    const [h = '8', m = '0'] = (hour || '08:00').split(':');
    const targetHour = parseInt(h, 10);
    const targetMin = parseInt(m, 10);

    const next = new Date(now);
    next.setHours(targetHour, targetMin, 0, 0);

    if (frequency === SubscriptionFrequency.WEEKLY && dayOfWeek !== undefined) {
      const currentDay = next.getDay();
      let diff = dayOfWeek - currentDay;
      if (diff < 0 || (diff === 0 && next <= now)) diff += 7;
      next.setDate(next.getDate() + diff);
    } else if (frequency === SubscriptionFrequency.BIWEEKLY) {
      next.setDate(next.getDate() + 14);
    } else if (frequency === SubscriptionFrequency.MONTHLY) {
      next.setDate(next.getDate() + 28);
    }

    if (next <= now) {
      if (frequency === SubscriptionFrequency.WEEKLY)
        next.setDate(next.getDate() + 7);
      else if (frequency === SubscriptionFrequency.BIWEEKLY)
        next.setDate(next.getDate() + 14);
      else if (frequency === SubscriptionFrequency.MONTHLY)
        next.setDate(next.getDate() + 28);
    }

    return next;
  }

  private getOrderModel(): Model<any> {
    return this.connection.model('Order');
  }
}
