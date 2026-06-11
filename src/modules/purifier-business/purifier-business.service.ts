import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { InventoryItem } from './schemas/inventory-item.schema';
import { InventoryMovement } from './schemas/inventory-movement.schema';
import { StoreSale } from './schemas/store-sale.schema';
import { CashRegister } from './schemas/cash-register.schema';
import {
  InventoryItemDto,
  CreateInventoryMovementDto,
  InventoryMovementQueryDto,
} from './dto/inventory.dto';
import { CreateStoreSaleDto, StoreSaleQueryDto } from './dto/store-sale.dto';
import {
  CreateCashRegisterDto,
  CreateCashEntryDto,
  CashRegisterQueryDto,
} from './dto/cash-register.dto';
import { SalesReportQueryDto } from './dto/report.dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { Role } from '../../common/interfaces/enums';

@Injectable()
export class PurifierBusinessService {
  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryModel: Model<InventoryItem>,
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovement>,
    @InjectModel(StoreSale.name)
    private readonly storeSaleModel: Model<StoreSale>,
    @InjectModel(CashRegister.name)
    private readonly cashRegisterModel: Model<CashRegister>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // --- Permission helpers ---

  private async assertPurifierOwner(
    purifierId: string,
    userId: string,
  ): Promise<void> {
    const purifier = await this.getPurifierModel().findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
  }

  private async assertPurifierOwnerOrAdmin(
    purifierId: string,
    userId: string,
    roles: string[],
  ): Promise<void> {
    if (roles.includes(Role.ADMIN)) return;
    await this.assertPurifierOwner(purifierId, userId);
  }

  // --- Inventory ---

  async getInventory(
    purifierId: string,
    userId: string,
    roles: string[],
  ): Promise<any> {
    await this.assertPurifierOwnerOrAdmin(purifierId, userId, roles);
    const items = await this.inventoryModel
      .find({ purifierId, ...softDeleteCondition(false) })
      .exec();
    return items.map((item) => ({
      ...item.toObject(),
      lowStock: item.availableQuantity < item.lowStockThreshold,
    }));
  }

  async updateInventory(
    purifierId: string,
    dto: InventoryItemDto[],
    userId: string,
  ): Promise<any> {
    await this.assertPurifierOwner(purifierId, userId);
    const results: any[] = [];
    for (const item of dto) {
      const existing = await this.inventoryModel
        .findOne({ purifierId, bottleSizeId: item.bottleSizeId })
        .exec();
      if (existing) {
        if (
          existing.availableQuantity !== item.availableQuantity ||
          existing.availableSeals !== item.availableSeals
        ) {
          await this.movementModel.create({
            purifierId,
            bottleSizeId: item.bottleSizeId,
            type: 'adjustment',
            quantity: item.availableQuantity - existing.availableQuantity,
            reason: 'Ajuste manual de inventario',
            createdBy: userId,
          });
        }
        Object.assign(existing, item);
        results.push(await existing.save());
      } else {
        const created = await this.inventoryModel.create({
          purifierId,
          ...item,
        });
        await this.movementModel.create({
          purifierId,
          bottleSizeId: item.bottleSizeId,
          type: 'adjustment',
          quantity: item.availableQuantity,
          reason: 'Inventario inicial',
          createdBy: userId,
        });
        results.push(created);
      }
    }
    return results;
  }

  async createMovement(
    purifierId: string,
    dto: CreateInventoryMovementDto,
    userId: string,
  ): Promise<any> {
    await this.assertPurifierOwner(purifierId, userId);

    const item = await this.inventoryModel
      .findOne({
        purifierId,
        bottleSizeId: dto.bottleSizeId,
        ...softDeleteCondition(false),
      })
      .exec();
    if (!item) {
      throw new BadRequestException('Artículo de inventario no encontrado');
    }

    if (dto.type === 'out' || dto.type === 'adjustment') {
      if (dto.type === 'out' && item.availableQuantity < dto.quantity) {
        throw new BadRequestException('Inventario insuficiente');
      }
      item.availableQuantity -= dto.quantity;
      item.availableSeals -= dto.seals ?? 0;
      if (item.availableQuantity < 0) item.availableQuantity = 0;
      if (item.availableSeals < 0) item.availableSeals = 0;
    } else {
      item.availableQuantity += dto.quantity;
      item.availableSeals += dto.seals ?? 0;
    }

    await item.save();

    return this.movementModel.create({
      purifierId,
      bottleSizeId: dto.bottleSizeId,
      type: dto.type,
      quantity: dto.quantity,
      seals: dto.seals ?? 0,
      reason: dto.reason,
      createdBy: userId,
    });
  }

  async findMovements(
    purifierId: string,
    query: InventoryMovementQueryDto,
    userId: string,
    roles: string[],
  ): Promise<PaginatedResult<InventoryMovement>> {
    await this.assertPurifierOwnerOrAdmin(purifierId, userId, roles);
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { purifierId, ...softDeleteCondition(false) };
    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.movementModel.countDocuments(filter).exec(),
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

  async deductInventory(
    purifierId: string,
    bottleSizeId: string,
    quantity: number,
    orderId: string,
  ): Promise<void> {
    const item = await this.inventoryModel
      .findOne({ purifierId, bottleSizeId })
      .exec();
    if (!item) return;
    item.availableQuantity = Math.max(0, item.availableQuantity - quantity);
    item.availableSeals = Math.max(0, item.availableSeals - quantity);
    await item.save();
    await this.movementModel.create({
      purifierId,
      bottleSizeId,
      type: 'out',
      quantity,
      seals: quantity,
      reason: `Pedido entregado #${orderId}`,
      createdBy: purifierId,
    });
  }

  // --- Store Sales ---

  async createStoreSale(
    purifierId: string,
    dto: CreateStoreSaleDto,
    userId: string,
  ): Promise<StoreSale> {
    await this.assertPurifierOwner(purifierId, userId);

    const sale = await this.storeSaleModel.create({
      purifierId,
      ...dto,
      source: 'local',
      createdBy: userId,
    });

    await this.deductInventory(
      purifierId,
      dto.bottleSizeId,
      dto.quantity,
      String(sale._id),
    );

    const today = new Date().toISOString().slice(0, 10);
    const register = await this.cashRegisterModel
      .findOne({ purifierId, date: today, isClosed: false })
      .exec();
    if (register) {
      register.entries.push({
        type: 'income',
        concept: `Venta en local #${String(sale._id).slice(-6)}`,
        amount: dto.total,
        createdAt: new Date(),
      });
      await register.save();
    }

    return sale;
  }

  async findStoreSales(
    purifierId: string,
    query: StoreSaleQueryDto,
    userId: string,
    roles: string[],
  ): Promise<PaginatedResult<StoreSale>> {
    await this.assertPurifierOwnerOrAdmin(purifierId, userId, roles);
    const { page = 1, limit = 20, from, to } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { purifierId, ...softDeleteCondition(false) };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    const [data, total] = await Promise.all([
      this.storeSaleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.storeSaleModel.countDocuments(filter).exec(),
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

  // --- Cash Registers ---

  async createCashRegister(
    purifierId: string,
    dto: CreateCashRegisterDto,
    userId: string,
  ): Promise<CashRegister> {
    await this.assertPurifierOwner(purifierId, userId);
    const date = dto.date || new Date().toISOString().slice(0, 10);

    const existing = await this.cashRegisterModel
      .findOne({ purifierId, date })
      .exec();
    if (existing) {
      throw new BadRequestException('Ya existe una caja para esta fecha');
    }

    return this.cashRegisterModel.create({
      purifierId,
      date,
      openingBalance: dto.openingBalance,
    });
  }

  async createCashEntry(
    purifierId: string,
    registerId: string,
    dto: CreateCashEntryDto,
    userId: string,
  ): Promise<CashRegister> {
    await this.assertPurifierOwner(purifierId, userId);
    const register = await this.cashRegisterModel
      .findOne({ _id: registerId, purifierId })
      .exec();
    if (!register) throw new NotFoundException('Caja no encontrada');
    if (register.isClosed)
      throw new BadRequestException('La caja ya está cerrada');

    register.entries.push({
      type: dto.type,
      concept: dto.concept,
      amount: dto.amount,
      createdAt: new Date(),
    });
    return register.save();
  }

  async closeCashRegister(
    purifierId: string,
    registerId: string,
    userId: string,
  ): Promise<CashRegister> {
    await this.assertPurifierOwner(purifierId, userId);
    const register = await this.cashRegisterModel
      .findOne({ _id: registerId, purifierId })
      .exec();
    if (!register) throw new NotFoundException('Caja no encontrada');
    if (register.isClosed)
      throw new BadRequestException('La caja ya está cerrada');

    const totalIncome = register.entries
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + e.amount, 0);
    const totalExpense = register.entries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0);
    register.closingBalance =
      register.openingBalance + totalIncome - totalExpense;
    register.isClosed = true;
    return register.save();
  }

  async findCashRegisters(
    purifierId: string,
    query: CashRegisterQueryDto,
    userId: string,
    roles: string[],
  ): Promise<PaginatedResult<CashRegister>> {
    await this.assertPurifierOwnerOrAdmin(purifierId, userId, roles);
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { purifierId, ...softDeleteCondition(false) };
    const [data, total] = await Promise.all([
      this.cashRegisterModel
        .find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.cashRegisterModel.countDocuments(filter).exec(),
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

  // --- Reports ---

  async getSalesReport(
    purifierId: string,
    query: SalesReportQueryDto,
    userId: string,
    roles: string[],
  ): Promise<any> {
    await this.assertPurifierOwnerOrAdmin(purifierId, userId, roles);
    const { period = 'daily', from, to, format = 'json' } = query;

    const dateFilter: any = {};
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;

    const orderFilter: any = {
      fulfillingPurifierId: purifierId,
      status: 'delivered',
      ...softDeleteCondition(false),
    };
    if (Object.keys(dateFilter).length) orderFilter.createdAt = dateFilter;

    const storeFilter: any = { purifierId, ...softDeleteCondition(false) };
    if (Object.keys(dateFilter).length) storeFilter.createdAt = dateFilter;

    const [orders, storeSales] = await Promise.all([
      this.getOrderModel().find(orderFilter).exec(),
      this.storeSaleModel.find(storeFilter).exec(),
    ]);

    const groupKey = (date: Date): string => {
      const d = new Date(date);
      if (period === 'weekly') {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        return start.toISOString().slice(0, 10);
      }
      if (period === 'monthly')
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return d.toISOString().slice(0, 10);
    };

    const groups: Record<
      string,
      { ordersCount: number; bottlesSold: number; revenue: number }
    > = {};

    for (const o of orders) {
      const key = groupKey(o.createdAt);
      if (!groups[key])
        groups[key] = { ordersCount: 0, bottlesSold: 0, revenue: 0 };
      groups[key].ordersCount += 1;
      groups[key].bottlesSold += o.quantity;
      groups[key].revenue += o.total || 0;
    }

    for (const s of storeSales) {
      const key = groupKey((s as any).createdAt);
      if (!groups[key])
        groups[key] = { ordersCount: 0, bottlesSold: 0, revenue: 0 };
      groups[key].bottlesSold += s.quantity;
      groups[key].revenue += s.total;
    }

    const data = Object.entries(groups)
      .map(([periodKey, vals]) => ({
        period: periodKey,
        ...vals,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totals = data.reduce(
      (acc, d) => ({
        ordersCount: acc.ordersCount + d.ordersCount,
        bottlesSold: acc.bottlesSold + d.bottlesSold,
        revenue: acc.revenue + d.revenue,
      }),
      { ordersCount: 0, bottlesSold: 0, revenue: 0 },
    );

    if (format === 'csv') {
      const header = 'period,ordersCount,bottlesSold,revenue\n';
      const rows = data
        .map(
          (d) => `${d.period},${d.ordersCount},${d.bottlesSold},${d.revenue}`,
        )
        .join('\n');
      return { csv: header + rows, totals };
    }

    return { data, totals };
  }

  private getPurifierModel(): Model<any> {
    return this.connection.model('Purifier');
  }

  private getOrderModel(): Model<any> {
    return this.connection.model('Order');
  }
}
