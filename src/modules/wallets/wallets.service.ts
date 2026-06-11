import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet } from './schemas/wallet.schema';
import { Transaction } from './schemas/transaction.schema';
import {
  DepositDto,
  WithdrawalDto,
  WalletTransactionQueryDto,
} from './dto/wallet.dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      wallet = await this.walletModel.create({ userId });
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance,
      blockedBalance: wallet.blockedBalance,
      debtBalance: wallet.debtBalance,
    };
  }

  async deposit(userId: string, dto: DepositDto, paymentReference?: string) {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.balance += dto.amount;
    await wallet.save();
    await this.transactionModel.create({
      walletId: String(wallet._id),
      type: 'deposit',
      amount: dto.amount,
      paymentReference: paymentReference || `pi_mock_${Date.now()}`,
      description: 'Depósito a monedero',
    });
    return wallet;
  }

  async withdraw(userId: string, dto: WithdrawalDto) {
    const wallet = await this.getOrCreateWallet(userId);
    const available = wallet.balance;
    if (dto.amount > available) {
      throw new BadRequestException('Saldo insuficiente');
    }
    const debtToPay = Math.min(wallet.debtBalance, dto.amount);
    if (debtToPay > 0) {
      wallet.debtBalance -= debtToPay;
      wallet.balance -= debtToPay;
      await this.transactionModel.create({
        walletId: String(wallet._id),
        type: 'commission',
        amount: debtToPay,
        description: 'Comisión pendiente de pedidos en efectivo',
      });
    }
    const remaining = dto.amount - debtToPay;
    if (remaining > 0) {
      wallet.balance -= remaining;
      await this.transactionModel.create({
        walletId: String(wallet._id),
        type: 'withdrawal',
        amount: remaining,
        paymentReference: `po_mock_${Date.now()}`,
        description: 'Retiro de monedero',
      });
    }
    await wallet.save();
    return wallet;
  }

  async block(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException('Saldo insuficiente en tu monedero');
    }
    wallet.balance -= amount;
    wallet.blockedBalance += amount;
    await wallet.save();
    return wallet;
  }

  async unblock(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.blockedBalance -= amount;
    wallet.balance += amount;
    await wallet.save();
    return wallet;
  }

  async settleOrder(
    userId: string,
    earning: number,
    commissionAmount: number,
    orderId: string,
    total: number,
    paymentMethod: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    if (paymentMethod === 'wallet') {
      wallet.blockedBalance -= total;
    } else {
      wallet.debtBalance += commissionAmount;
    }
    wallet.balance += earning;
    await wallet.save();
    await this.transactionModel.create({
      walletId: String(wallet._id),
      type: 'earning',
      amount: earning,
      orderId,
      description: `Ganancia por pedido #${orderId}`,
    });
    if (commissionAmount > 0) {
      await this.transactionModel.create({
        walletId: String(wallet._id),
        type: 'commission',
        orderId,
        description: 'Comisión del pedido',
      });
    }
  }

  async addDebt(userId: string, amount: number, description: string) {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.debtBalance += amount;
    await wallet.save();
    await this.transactionModel.create({
      walletId: String(wallet._id),
      type: 'commission',
      amount,
      description,
    });
  }

  async findTransactions(
    userId: string,
    query: WalletTransactionQueryDto,
  ): Promise<PaginatedResult<Transaction>> {
    const wallet = await this.getOrCreateWallet(userId);
    const { page = 1, limit = 20, type } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = {
      walletId: String(wallet._id),
      ...softDeleteCondition(false),
    };
    if (type) filter.type = type;
    const [data, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
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
}
