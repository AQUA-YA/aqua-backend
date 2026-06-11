import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { LoyaltyEntry } from './schemas/loyalty-entry.schema';
import { LoyaltyEvent } from './schemas/loyalty-event.schema';
import {
  CreateLoyaltyEventDto,
  UpdateLoyaltyEventDto,
  LoyaltyEventQueryDto,
  LoyaltyEntryQueryDto,
} from './dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import {
  LOYALTY_POINTS_PER_PESO,
  LOYALTY_EXPIRATION_DAYS,
  LOYALTY_REDEMPTIONS,
} from '../../common/constants/business.constants';
import { LoyaltyEntryType, Role } from '../../common/interfaces/enums';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectModel(LoyaltyEntry.name)
    private readonly entryModel: Model<LoyaltyEntry>,
    @InjectModel(LoyaltyEvent.name)
    private readonly eventModel: Model<LoyaltyEvent>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getBalance(
    userId: string,
  ): Promise<{ balance: number; expiringSoon: any[] }> {
    const now = new Date();
    const entries = await this.entryModel
      .find({
        userId,
        type: { $in: ['earn', 'bonus'] },
        remainingPoints: { $gt: 0 },
        ...softDeleteCondition(false),
      })
      .exec();

    let balance = 0;
    const expiringSoon: any[] = [];
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    for (const e of entries) {
      balance += e.remainingPoints;
      if (
        e.expiresAt &&
        e.expiresAt <= thirtyDaysFromNow &&
        e.expiresAt > now
      ) {
        expiringSoon.push({
          points: e.remainingPoints,
          expiresAt: e.expiresAt,
        });
      }
    }

    return { balance, expiringSoon };
  }

  async getEntries(
    userId: string,
    query: LoyaltyEntryQueryDto,
  ): Promise<PaginatedResult<LoyaltyEntry>> {
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { userId, ...softDeleteCondition(false) };
    const [data, total] = await Promise.all([
      this.entryModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.entryModel.countDocuments(filter).exec(),
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

  async earnPoints(
    userId: string,
    subtotal: number,
    orderId: string,
    purifierId?: string,
    waterTypeId?: string,
  ): Promise<void> {
    const multiplier = await this.applyMultiplier(purifierId, waterTypeId);
    const points = Math.floor(subtotal * LOYALTY_POINTS_PER_PESO * multiplier);
    if (points <= 0) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LOYALTY_EXPIRATION_DAYS);
    await this.entryModel.create({
      userId,
      orderId,
      type: LoyaltyEntryType.EARN,
      points,
      remainingPoints: points,
      expiresAt,
    });
  }

  async redeemPoints(
    userId: string,
    points: number,
    subtotal: number,
    deliveryFee: number,
    waterTypeId?: string,
    bottleSizeId?: string,
  ): Promise<number> {
    const redemption =
      LOYALTY_REDEMPTIONS[points as keyof typeof LOYALTY_REDEMPTIONS];
    if (!redemption) {
      throw new BadRequestException('Ese canje no está disponible');
    }

    const { balance } = await this.getBalance(userId);
    if (balance < points) {
      throw new BadRequestException('No tienes puntos suficientes');
    }

    let discount = 0;

    if (redemption.type === 'discount') {
      discount = Math.min(redemption.value, subtotal + deliveryFee);
    } else if (redemption.type === 'free_bottle') {
      const [waterType, bottleSize] = await Promise.all([
        this.getWaterTypeModel().findById(waterTypeId).exec(),
        this.getBottleSizeModel().findById(bottleSizeId).exec(),
      ]);
      if (!waterType || !bottleSize) {
        throw new BadRequestException('Ese canje no aplica a este pedido');
      }
      if (
        bottleSize.liters !== redemption.liters ||
        waterType.name !== redemption.waterTypeName
      ) {
        throw new BadRequestException('Ese canje no aplica a este pedido');
      }
    }

    await this.consumeFifo(userId, points);

    await this.entryModel.create({
      userId,
      type: LoyaltyEntryType.REDEEM,
      points,
      remainingPoints: 0,
    });

    return discount;
  }

  async expirePoints(): Promise<void> {
    const now = new Date();
    const expired = await this.entryModel
      .find({
        type: { $in: ['earn', 'bonus'] },
        remainingPoints: { $gt: 0 },
        expiresAt: { $lt: now },
        ...softDeleteCondition(false),
      })
      .exec();

    for (const entry of expired) {
      await this.entryModel.create({
        userId: entry.userId,
        type: LoyaltyEntryType.EXPIRE,
        points: entry.remainingPoints,
        remainingPoints: 0,
      });
      entry.remainingPoints = 0;
      await entry.save();
    }
  }

  async applyMultiplier(
    purifierId?: string,
    waterTypeId?: string,
  ): Promise<number> {
    const now = new Date();
    const events = await this.eventModel
      .find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        ...softDeleteCondition(false),
      })
      .exec();

    let maxMultiplier = 1;
    for (const event of events) {
      if (
        event.purifierId &&
        purifierId &&
        String(event.purifierId) !== purifierId
      )
        continue;
      if (
        event.waterTypeId &&
        waterTypeId &&
        String(event.waterTypeId) !== waterTypeId
      )
        continue;
      if (event.multiplier > maxMultiplier) {
        maxMultiplier = event.multiplier;
      }
    }
    return maxMultiplier;
  }

  private async consumeFifo(userId: string, points: number): Promise<void> {
    const entries = await this.entryModel
      .find({
        userId,
        type: { $in: ['earn', 'bonus'] },
        remainingPoints: { $gt: 0 },
        ...softDeleteCondition(false),
      })
      .sort({ createdAt: 1 })
      .exec();

    let toConsume = points;
    for (const entry of entries) {
      if (toConsume <= 0) break;
      const consume = Math.min(entry.remainingPoints, toConsume);
      entry.remainingPoints -= consume;
      toConsume -= consume;
      await entry.save();
    }
  }

  async revertRedeem(userId: string, points: number): Promise<void> {
    const redeemEntry = await this.entryModel
      .findOne({
        userId,
        type: LoyaltyEntryType.REDEEM,
        points,
        ...softDeleteCondition(false),
      })
      .sort({ createdAt: -1 })
      .exec();
    if (redeemEntry) {
      (redeemEntry as any).deletedAt = new Date();
      await redeemEntry.save();
    }

    const entries = await this.entryModel
      .find({
        userId,
        type: { $in: ['earn', 'bonus'] },
        ...softDeleteCondition(false),
      })
      .sort({ createdAt: 1 })
      .exec();

    let toRestore = points;
    for (const entry of entries) {
      if (toRestore <= 0) break;
      const maxRestore = entry.points - entry.remainingPoints;
      if (maxRestore > 0) {
        const restore = Math.min(maxRestore, toRestore);
        entry.remainingPoints += restore;
        toRestore -= restore;
        await entry.save();
      }
    }
  }

  // LoyaltyEvent CRUD

  async createEvent(
    dto: CreateLoyaltyEventDto,
    userId: string,
    roles: string[],
  ): Promise<LoyaltyEvent> {
    const isAdmin = roles.includes(Role.ADMIN);
    const isPurifier = roles.includes(Role.PURIFIER);

    if (!isAdmin && !isPurifier) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    if (isPurifier && !isAdmin && dto.multiplier > 3) {
      throw new BadRequestException(
        'El multiplicador máximo para purificadores es 3',
      );
    }

    if (isPurifier && !isAdmin && !dto.purifierId) {
      throw new BadRequestException('Debes especificar una purificadora');
    }

    return this.eventModel.create({ ...dto, createdBy: userId });
  }

  async findAllEvents(
    query: LoyaltyEventQueryDto,
  ): Promise<PaginatedResult<LoyaltyEvent>> {
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { ...softDeleteCondition(false) };
    const [data, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.eventModel.countDocuments(filter).exec(),
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

  async updateEvent(
    id: string,
    dto: UpdateLoyaltyEventDto,
    userId: string,
    roles: string[],
  ): Promise<LoyaltyEvent> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new NotFoundException('Recurso no encontrado');
    if (String(event.createdBy) !== userId && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    Object.assign(event, dto);
    return event.save();
  }

  async removeEvent(
    id: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) throw new NotFoundException('Recurso no encontrado');
    if (String(event.createdBy) !== userId && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    (event as any).deletedAt = new Date();
    await event.save();
  }

  private getWaterTypeModel(): Model<any> {
    return this.connection.model('WaterType');
  }

  private getBottleSizeModel(): Model<any> {
    return this.connection.model('BottleSize');
  }
}
