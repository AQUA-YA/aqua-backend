import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Coupon } from './schemas/coupon.schema';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponQueryDto,
} from './dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { CouponType, Role } from '../../common/interfaces/enums';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(
    dto: CreateCouponDto,
    userId: string,
    roles: string[],
  ): Promise<Coupon> {
    const isAdmin = roles.includes(Role.ADMIN);
    const isPurifier = roles.includes(Role.PURIFIER);

    if (!isAdmin && !isPurifier) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    if (isPurifier && !isAdmin) {
      if (!dto.purifierId) {
        throw new BadRequestException('Debes especificar una purificadora');
      }
      if (dto.isWelcome) {
        throw new BadRequestException('No puedes crear cupones de bienvenida');
      }
    }

    const data: any = { ...dto, createdBy: userId };
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    return this.couponModel.create(data);
  }

  async findAll(query: CouponQueryDto): Promise<PaginatedResult<Coupon>> {
    const { page = 1, limit = 20, search } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { ...softDeleteCondition(false) };
    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }
    const [data, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.couponModel.countDocuments(filter).exec(),
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

  async findMine(userId: string): Promise<Coupon[]> {
    const purifierIds = await this.getUserPurifierIds(userId);
    return this.couponModel
      .find({ purifierId: { $in: purifierIds }, ...softDeleteCondition(false) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    dto: UpdateCouponDto,
    userId: string,
    roles: string[],
  ): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Recurso no encontrado');
    if (String(coupon.createdBy) !== userId && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    Object.assign(coupon, dto);
    return coupon.save();
  }

  async remove(id: string, userId: string, roles: string[]): Promise<void> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Recurso no encontrado');
    if (String(coupon.createdBy) !== userId && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    (coupon as any).deletedAt = new Date();
    await coupon.save();
  }

  async validate(dto: ValidateCouponDto, userId: string): Promise<any> {
    const coupon = await this.couponModel
      .findOne({ code: dto.code.toUpperCase(), ...softDeleteCondition(false) })
      .exec();
    if (!coupon) {
      throw new BadRequestException('El cupón no es válido o ya expiró');
    }

    const now = new Date();
    if (!coupon.isActive || now < coupon.startsAt || now > coupon.endsAt) {
      throw new BadRequestException('El cupón no es válido o ya expiró');
    }

    if (
      coupon.maxUses !== null &&
      coupon.maxUses !== undefined &&
      coupon.usedCount >= coupon.maxUses
    ) {
      throw new BadRequestException('El cupón no es válido o ya expiró');
    }

    if (
      coupon.purifierId &&
      dto.purifierId &&
      String(coupon.purifierId) !== dto.purifierId
    ) {
      throw new BadRequestException('El cupón no es válido o ya expiró');
    }

    if (coupon.isWelcome) {
      const orderModel = this.getOrderModel();
      const delivered = await orderModel
        .countDocuments({ consumerId: userId, status: 'delivered' })
        .exec();
      if (delivered > 0) {
        throw new BadRequestException('El cupón es solo para tu primer pedido');
      }
    }

    const userUsage = await this.countUserUsage(coupon, userId);
    if (userUsage >= coupon.maxUsesPerUser) {
      throw new BadRequestException('El cupón no es válido o ya expiró');
    }

    let discount = 0;
    let newDeliveryFee = dto.deliveryFee;
    const base = dto.subtotal;

    switch (coupon.type) {
      case CouponType.AMOUNT:
        discount = Math.min(coupon.value, base + dto.deliveryFee);
        break;
      case CouponType.PERCENTAGE:
        discount = (base * coupon.value) / 100;
        break;
      case CouponType.TWO_FOR_ONE:
        discount = 0;
        break;
      case CouponType.FREE_DELIVERY:
        newDeliveryFee = 0;
        break;
    }

    return { valid: true, discount, newDeliveryFee, coupon };
  }

  async countUserUsage(coupon: Coupon, userId: string): Promise<number> {
    const orderModel = this.getOrderModel();
    return orderModel
      .countDocuments({
        consumerId: userId,
        couponId: String((coupon as any)._id),
        status: { $ne: 'cancelled' },
      })
      .exec();
  }

  private getOrderModel(): Model<any> {
    return this.connection.model('Order');
  }

  private async getUserPurifierIds(userId: string): Promise<string[]> {
    const purifiers = await this.connection
      .model('Purifier')
      .find({ ownerId: userId, ...softDeleteCondition(false) })
      .exec();
    return purifiers.map((p: any) => String(p._id));
  }
}
