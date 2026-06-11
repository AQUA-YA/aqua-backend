import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Order } from './schemas/order.schema';
import { OrderStatusHistory } from './schemas/order-status-history.schema';
import { Wallet } from '../wallets/schemas/wallet.schema';
import { Transaction } from '../wallets/schemas/transaction.schema';
import { WalletsService } from '../wallets/wallets.service';
import { MAIL_PROVIDER, PUSH_PROVIDER } from '../../providers/providers.module';
import type {
  MailProvider,
  PushProvider,
} from '../../providers/providers.module';
import {
  CreateOrderDto,
  DeliverOrderDto,
  CancelOrderDto,
  AvailableOrdersQueryDto,
  MyOrdersQueryDto,
  AssignedOrdersQueryDto,
  AdminOrdersQueryDto,
} from './dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import {
  OrderStatus,
  OrderMode,
  PaymentMethod,
  Role,
} from '../../common/interfaces/enums';
const VALID_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.ACCEPTED]: [OrderStatus.IN_TRANSIT],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.EMPTY_PICKUP, OrderStatus.DELIVERED],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(OrderStatusHistory.name)
    private readonly historyModel: Model<OrderStatusHistory>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
    @Inject(MAIL_PROVIDER) private readonly mailProvider: MailProvider,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    const deliveryAddress = await this.resolveAddress(userId, dto);
    if (!deliveryAddress) {
      throw new BadRequestException(
        'Debes proporcionar una dirección de entrega',
      );
    }

    let unitPrice: number | undefined;
    let deliveryFee = 0;
    let subtotal: number | undefined;
    let total: number | undefined;
    let estimatedMaxTotal: number | undefined;
    const discount = 0;

    if (dto.mode === OrderMode.TO_PURIFIER) {
      if (!dto.targetPurifierId) {
        throw new BadRequestException(
          'Modo to_purifier requiere targetPurifierId',
        );
      }
      const purifier = await this.getPurifierModel()
        .findById(dto.targetPurifierId)
        .exec();
      if (!purifier) {
        throw new BadRequestException('Purificadora no encontrada');
      }
      deliveryFee = purifier.deliveryFee ?? 0;
      const price = await this.resolvePurifierPrice(
        dto.targetPurifierId,
        dto.waterTypeId,
        dto.bottleSizeId,
      );
      if (!price) {
        throw new BadRequestException('La purificadora no ofrece ese producto');
      }
      unitPrice = price.price;
      subtotal = unitPrice * dto.quantity;
      total = subtotal + deliveryFee + (dto.tip ?? 0) - discount;
    } else if (dto.mode === OrderMode.TO_DELIVERY) {
      if (!dto.targetDeliveryUserId) {
        throw new BadRequestException(
          'Modo to_delivery requiere targetDeliveryUserId',
        );
      }
      const profile = await this.getDeliveryProfileModel()
        .findOne({ userId: dto.targetDeliveryUserId })
        .exec();
      deliveryFee = profile?.deliveryFee ?? 0;
      const price = await this.resolveDeliveryPrice(
        dto.targetDeliveryUserId,
        dto.waterTypeId,
        dto.bottleSizeId,
      );
      if (!price) {
        throw new BadRequestException('El repartidor no ofrece ese producto');
      }
      unitPrice = price.price;
      subtotal = unitPrice * dto.quantity;
      total = subtotal + deliveryFee + (dto.tip ?? 0) - discount;
    } else {
      const estMax = await this.calculateEstimatedMax(
        dto.waterTypeId,
        dto.bottleSizeId,
        dto.quantity,
        deliveryFee,
        dto.tip ?? 0,
        discount,
      );
      if (estMax === null) {
        throw new BadRequestException(
          'No hay oferta disponible en tu zona para ese producto',
        );
      }
      estimatedMaxTotal = estMax;
    }

    const blockAmount = total ?? estimatedMaxTotal!;
    if (dto.paymentMethod === PaymentMethod.WALLET) {
      await this.walletsService.block(userId, blockAmount);
    }

    const order = await this.orderModel.create({
      consumerId: userId,
      mode: dto.mode,
      targetPurifierId: dto.targetPurifierId,
      targetDeliveryUserId: dto.targetDeliveryUserId,
      waterTypeId: dto.waterTypeId,
      bottleSizeId: dto.bottleSizeId,
      quantity: dto.quantity,
      unitPrice,
      subtotal,
      deliveryFee,
      tip: dto.tip ?? 0,
      discount,
      total,
      estimatedMaxTotal,
      blockedAmount: blockAmount,
      paymentMethod: dto.paymentMethod,
      deliveryAddress,
      requiresEmptyPickup: dto.requiresEmptyPickup ?? false,
      status: OrderStatus.PENDING,
    });

    await this.historyModel.create({
      orderId: String(order._id),
      fromStatus: undefined,
      toStatus: OrderStatus.PENDING,
      changedBy: userId,
    });

    return order;
  }

  async findAvailable(_userId: string, _query: AvailableOrdersQueryDto) {
    const orders = await this.orderModel
      .find({
        status: OrderStatus.PENDING,
        ...softDeleteCondition(false),
      })
      .sort({ createdAt: -1 })
      .exec();

    return orders;
  }

  async accept(id: string, userId: string, roles: string[]) {
    const existing = await this.orderModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if ((existing as any).deletedAt) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (existing.status !== OrderStatus.PENDING) {
      throw new ConflictException('El pedido ya fue tomado');
    }

    const isPurifier = roles.includes(Role.PURIFIER);
    const isDelivery = roles.includes(Role.DELIVERY);

    if (!isPurifier && !isDelivery) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    let unitPrice: number;
    let deliveryFee: number;
    let fulfillingPurifierId: string | undefined;
    let discount = existing.discount;

    const waterTypeId = String(existing.waterTypeId);
    const bottleSizeId = String(existing.bottleSizeId);
    const quantity = existing.quantity;

    if (isPurifier) {
      const purifier = await this.findPurifierByOwner(userId);
      if (!purifier) {
        throw new BadRequestException('No tienes una purificadora registrada');
      }
      const price = await this.resolvePurifierPrice(
        String(purifier._id),
        waterTypeId,
        bottleSizeId,
      );
      if (!price) {
        throw new BadRequestException('Tu purificadora no ofrece ese producto');
      }
      unitPrice = price.price;
      deliveryFee = purifier.deliveryFee ?? 0;
      fulfillingPurifierId = String(purifier._id);
    } else {
      const deliveryProfile = await this.getDeliveryProfileModel()
        .findOne({ userId })
        .exec();
      if (!deliveryProfile) {
        throw new BadRequestException('No tienes perfil de repartidor');
      }
      if (deliveryProfile.kycStatus !== 'approved') {
        throw new BadRequestException(
          'Debes completar tu verificación de identidad',
        );
      }
      if (!deliveryProfile.isAvailable) {
        throw new BadRequestException('No estás disponible');
      }

      const price = await this.resolveDeliveryPrice(
        userId,
        waterTypeId,
        bottleSizeId,
      );
      if (price) {
        unitPrice = price.price;
        deliveryFee = deliveryProfile.deliveryFee ?? 0;
      } else {
        const link = await this.findPurifierLinkForDelivery(
          userId,
          waterTypeId,
          bottleSizeId,
        );
        if (!link) {
          throw new BadRequestException(
            'No tienes precio ni vínculo para este producto',
          );
        }
        const purifierPrice = await this.resolvePurifierPrice(
          String(link.purifierId),
          waterTypeId,
          bottleSizeId,
        );
        if (!purifierPrice) {
          throw new BadRequestException(
            'Producto no disponible en la purificadora vinculada',
          );
        }
        unitPrice = purifierPrice.price;
        deliveryFee = 0;
        fulfillingPurifierId = String(link.purifierId);
      }
    }

    const subtotal = unitPrice * quantity;
    const maxDiscount = subtotal + deliveryFee;
    if (discount > maxDiscount) {
      discount = maxDiscount;
    }
    const total = subtotal + deliveryFee + existing.tip - discount;

    const updated = await this.orderModel
      .findOneAndUpdate(
        {
          _id: id,
          status: OrderStatus.PENDING,
          deletedAt: null,
        },
        {
          $set: {
            status: OrderStatus.ACCEPTED,
            acceptedById: userId,
            fulfillingPurifierId,
            unitPrice,
            subtotal,
            deliveryFee,
            discount,
            total,
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException('El pedido ya fue tomado');
    }

    if (existing.paymentMethod === PaymentMethod.WALLET) {
      try {
        const diff = (existing.estimatedMaxTotal ?? 0) - total;
        if (diff > 0) {
          await this.walletsService.unblock(String(existing.consumerId), diff);
        } else if (diff < 0) {
          await this.walletsService.block(
            String(existing.consumerId),
            Math.abs(diff),
          );
        }
        updated.blockedAmount = total;
        await updated.save();
      } catch {
        await this.orderModel
          .findByIdAndUpdate(id, {
            $set: {
              status: OrderStatus.PENDING,
              acceptedById: null,
              fulfillingPurifierId: null,
              unitPrice: null,
              subtotal: null,
              deliveryFee: 0,
              total: null,
            },
          })
          .exec();
        throw new ConflictException(
          'No puedes aceptar este pedido: excede el saldo bloqueado del cliente',
        );
      }
    }

    await this.historyModel.create({
      orderId: id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.ACCEPTED,
      changedBy: userId,
    });

    return updated;
  }

  async assign(id: string, deliveryUserId: string, userId: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order || (order as any).deletedAt) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (String(order.acceptedById) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para asignar este pedido',
      );
    }
    if (order.mode !== OrderMode.TO_PURIFIER && !order.fulfillingPurifierId) {
      throw new BadRequestException(
        'Este pedido no requiere asignación de repartidor',
      );
    }

    order.assignedDeliveryUserId = deliveryUserId;
    await order.save();
    return order;
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    roles: string[],
  ) {
    const order = await this.orderModel.findById(id).exec();
    if (!order || (order as any).deletedAt) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const isInvolved =
      String(order.acceptedById) === userId ||
      String(order.assignedDeliveryUserId) === userId;
    if (!isInvolved && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    const prevStatus = order.status;
    const allowedFrom = VALID_TRANSITIONS[prevStatus];
    if (!allowedFrom || !allowedFrom.includes(status)) {
      throw new BadRequestException('Transición de estado inválida');
    }

    if (status === OrderStatus.EMPTY_PICKUP && !order.requiresEmptyPickup) {
      throw new BadRequestException(
        'Este pedido no requiere recogida de garrafón vacío',
      );
    }

    order.status = status;
    await order.save();

    await this.historyModel.create({
      orderId: id,
      fromStatus: prevStatus,
      toStatus: status,
      changedBy: userId,
    });

    return order;
  }

  async deliver(
    id: string,
    dto: DeliverOrderDto,
    userId: string,
    roles: string[],
  ) {
    const order = await this.orderModel.findById(id).exec();
    if (!order || (order as any).deletedAt) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const isInvolved =
      String(order.acceptedById) === userId ||
      String(order.assignedDeliveryUserId) === userId;
    if (!isInvolved && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    if (
      order.status !== OrderStatus.IN_TRANSIT &&
      order.status !== OrderStatus.EMPTY_PICKUP
    ) {
      throw new BadRequestException(
        'El pedido debe estar en tránsito para entregarse',
      );
    }

    const prevStatus = order.status;
    const total = order.total!;
    const commissionAmount = await this.calculateCommission(total);
    const validatedCommission = Math.min(commissionAmount, total);
    const earning = total - validatedCommission;

    const consumerId = String(order.consumerId);
    const paymentMethod = order.paymentMethod;
    const earnerId = await this.resolveEarnerId(order);

    if (paymentMethod === PaymentMethod.WALLET) {
      const consumerWallet =
        await this.walletsService.getOrCreateWallet(consumerId);
      consumerWallet.blockedBalance -= order.blockedAmount;
      await consumerWallet.save();
      await this.transactionModel.create({
        walletId: String(consumerWallet._id),
        type: 'payment',
        amount: total,
        orderId: id,
        description: `Pago del pedido #${id.slice(-6)}`,
      });
    }

    const earnerWallet = await this.walletsService.getOrCreateWallet(earnerId);
    earnerWallet.balance += earning;
    if (paymentMethod === PaymentMethod.CASH) {
      earnerWallet.debtBalance += validatedCommission;
    }
    await earnerWallet.save();

    await this.transactionModel.create({
      walletId: String(earnerWallet._id),
      type: 'earning',
      amount: total,
      orderId: id,
      description: `Ganancia por pedido #${id.slice(-6)}`,
    });

    if (validatedCommission > 0) {
      await this.transactionModel.create({
        walletId: String(earnerWallet._id),
        type: 'commission',
        amount: validatedCommission,
        orderId: id,
        description:
          paymentMethod === PaymentMethod.WALLET
            ? 'Comisión del pedido'
            : 'Comisión pendiente (pedido en efectivo)',
      });
    }

    if (dto.emptyBottleReturned !== undefined) {
      order.emptyBottleReturned = dto.emptyBottleReturned;
    }

    order.status = OrderStatus.DELIVERED;
    order.commissionAmount = validatedCommission;
    await order.save();

    await this.historyModel.create({
      orderId: id,
      fromStatus: prevStatus,
      toStatus: OrderStatus.DELIVERED,
      changedBy: userId,
    });

    return order;
  }

  async cancel(
    id: string,
    dto: CancelOrderDto,
    userId: string,
    roles: string[],
  ) {
    const order = await this.orderModel.findById(id).exec();
    if (!order || (order as any).deletedAt) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const isConsumer = String(order.consumerId) === userId;
    const isAcceptor = String(order.acceptedById) === userId;
    const isAdmin = roles.includes(Role.ADMIN);

    if (!isConsumer && !isAcceptor && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para cancelar este pedido',
      );
    }

    const prevStatus = order.status;

    if (isConsumer && !isAdmin && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo puedes cancelar pedidos pendientes');
    }

    const cancelStates = [
      OrderStatus.ACCEPTED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.EMPTY_PICKUP,
    ];
    const isAcceptorCancel =
      isAcceptor &&
      !isConsumer &&
      cancelStates.includes(order.status as OrderStatus);

    if (isAcceptorCancel) {
      if (
        order.paymentMethod === PaymentMethod.WALLET &&
        order.blockedAmount > 0
      ) {
        await this.walletsService.unblock(
          String(order.consumerId),
          order.blockedAmount,
        );
      }

      order.status = OrderStatus.PENDING;
      order.acceptedById = undefined;
      order.fulfillingPurifierId = undefined;
      order.unitPrice = undefined;
      order.subtotal = undefined;
      order.deliveryFee = 0;
      order.total = undefined;
      order.assignedDeliveryUserId = undefined;
      order.cancellationReason = dto.reason;
      order.blockedAmount = 0;
      await order.save();

      await this.historyModel.create({
        orderId: id,
        fromStatus: prevStatus,
        toStatus: OrderStatus.PENDING,
        changedBy: userId,
      });
    } else {
      if (
        order.paymentMethod === PaymentMethod.WALLET &&
        order.blockedAmount > 0
      ) {
        await this.walletsService.unblock(
          String(order.consumerId),
          order.blockedAmount,
        );
      }

      order.status = OrderStatus.CANCELLED;
      order.cancellationReason = dto.reason;
      order.blockedAmount = 0;
      await order.save();

      await this.historyModel.create({
        orderId: id,
        fromStatus: prevStatus,
        toStatus: OrderStatus.CANCELLED,
        changedBy: userId,
      });
    }

    return order;
  }

  async findMine(
    userId: string,
    query: MyOrdersQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, status } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = {
      consumerId: userId,
      ...softDeleteCondition(false),
    };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
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

  async findAssigned(
    userId: string,
    query: AssignedOrdersQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, status } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = {
      $or: [{ acceptedById: userId }, { assignedDeliveryUserId: userId }],
      ...softDeleteCondition(false),
    };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
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

  async findAll(query: AdminOrdersQueryDto): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 20, status } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { ...softDeleteCondition(false) };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
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

  async findOne(id: string, userId: string, roles: string[]) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const isInvolved =
      String(order.consumerId) === userId ||
      String(order.acceptedById) === userId ||
      String(order.assignedDeliveryUserId) === userId;
    if (!isInvolved && !roles.includes(Role.ADMIN)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }

    const history = await this.historyModel
      .find({ orderId: id })
      .sort({ createdAt: 1 })
      .exec();

    return { order, history };
  }

  private async resolveAddress(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<Record<string, any> | null> {
    if (dto.addressId) {
      const user = await this.getUserModel().findById(userId).exec();
      if (!user) return null;
      const addr = user.addresses?.find(
        (a: any) => String(a._id) === dto.addressId,
      );
      if (!addr) return null;
      return {
        alias: addr.alias,
        street: addr.street,
        neighborhood: addr.neighborhood,
        city: addr.city,
        zipCode: addr.zipCode,
        reference: addr.reference,
        location: addr.location,
        isPrimary: addr.isPrimary ?? false,
      };
    }
    if (dto.deliveryAddress) {
      const addr = dto.deliveryAddress;
      return {
        alias: addr.alias,
        street: addr.street,
        neighborhood: addr.neighborhood,
        city: addr.city,
        zipCode: addr.zipCode,
        reference: addr.reference,
        location: addr.location
          ? {
              type: 'Point' as const,
              coordinates: [addr.location.lng, addr.location.lat],
            }
          : undefined,
        isPrimary: addr.isPrimary ?? false,
      };
    }
    return null;
  }

  private async resolvePurifierPrice(
    purifierId: string,
    waterTypeId: string,
    bottleSizeId: string,
  ): Promise<{ price: number } | null> {
    return this.getPurifierPriceModel()
      .findOne({ purifierId, waterTypeId, bottleSizeId })
      .exec();
  }

  private async resolveDeliveryPrice(
    deliveryUserId: string,
    waterTypeId: string,
    bottleSizeId: string,
  ): Promise<{ price: number } | null> {
    return this.getDeliveryPriceModel()
      .findOne({ deliveryUserId, waterTypeId, bottleSizeId })
      .exec();
  }

  private async calculateEstimatedMax(
    waterTypeId: string,
    bottleSizeId: string,
    quantity: number,
    deliveryFee: number,
    tip: number,
    discount: number,
  ): Promise<number | null> {
    const prices = await this.getPurifierPriceModel()
      .find({ waterTypeId, bottleSizeId })
      .sort({ price: -1 })
      .limit(1)
      .exec();
    if (prices.length === 0) return null;
    const maxUnitPrice = prices[0].price;
    return maxUnitPrice * quantity + deliveryFee + tip - discount;
  }

  private async calculateCommission(total: number): Promise<number> {
    const config = await this.getCommissionConfigModel()
      .findOne()
      .sort({ createdAt: -1 })
      .exec();
    if (!config) return 0;
    if (config.type === 'disabled') return 0;
    if (config.type === 'fixed') return Math.min(config.value, total);
    if (config.type === 'percentage') {
      return Math.min((total * config.value) / 100, total);
    }
    return 0;
  }

  private async resolveEarnerId(order: Order): Promise<string> {
    if (order.fulfillingPurifierId) {
      const purifier = await this.getPurifierModel()
        .findById(order.fulfillingPurifierId)
        .exec();
      if (purifier) return String(purifier.ownerId);
    }
    return String(order.acceptedById);
  }

  private async findPurifierByOwner(ownerId: string): Promise<any> {
    return this.getPurifierModel()
      .findOne({ ownerId, ...softDeleteCondition(false) })
      .exec();
  }

  private async findPurifierLinkForDelivery(
    deliveryUserId: string,
    waterTypeId: string,
    bottleSizeId: string,
  ): Promise<{ purifierId: any } | null> {
    const links = await this.getDeliveryLinkModel()
      .find({ deliveryUserId, ...softDeleteCondition(false) })
      .exec();
    for (const link of links) {
      const purifier = await this.getPurifierModel()
        .findById(link.purifierId)
        .exec();
      if (
        purifier &&
        purifier.waterTypeIds?.some((id: any) => String(id) === waterTypeId) &&
        purifier.bottleSizeIds?.some((id: any) => String(id) === bottleSizeId)
      ) {
        return { purifierId: link.purifierId };
      }
    }
    return null;
  }

  private getUserModel(): Model<any> {
    return this.connection.model('User');
  }

  private getPurifierModel(): Model<any> {
    return this.connection.model('Purifier');
  }

  private getPurifierPriceModel(): Model<any> {
    return this.connection.model('PurifierPrice');
  }

  private getDeliveryPriceModel(): Model<any> {
    return this.connection.model('DeliveryPrice');
  }

  private getDeliveryProfileModel(): Model<any> {
    return this.connection.model('DeliveryProfile');
  }

  private getDeliveryLinkModel(): Model<any> {
    return this.connection.model('PurifierDeliveryLink');
  }

  private getCommissionConfigModel(): Model<any> {
    return this.connection.model('CommissionConfig');
  }
}
