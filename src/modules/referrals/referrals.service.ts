import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Referral } from './schemas/referral.schema';
import {
  REFERRAL_BONUS_REFERRER,
  REFERRAL_BONUS_REFERRED,
  REFERRAL_MONTHLY_CAP,
} from '../../common/constants/business.constants';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { TransactionType } from '../../common/interfaces/enums';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(Referral.name) private readonly referralModel: Model<Referral>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(
    referrerId: string,
    referredId: string,
    codeUsed: string,
  ): Promise<Referral> {
    return this.referralModel.create({
      referrerId,
      referredId,
      codeUsed,
      referrerBonus: REFERRAL_BONUS_REFERRER,
      referredBonus: REFERRAL_BONUS_REFERRED,
    });
  }

  async processFirstOrderBonus(
    referredId: string,
    orderId: string,
  ): Promise<void> {
    const referral = await this.referralModel
      .findOne({
        referredId,
        firstOrderCompleted: false,
        ...softDeleteCondition(false),
      })
      .exec();
    if (!referral) return;

    referral.firstOrderCompleted = true;
    referral.bonusPaidAt = new Date();
    await referral.save();

    const walletsService = this.getWalletsService();

    await walletsService.deposit(
      referredId,
      { amount: referral.referredBonus },
      `ref_${orderId}`,
    );
    await this.createTransaction(
      referredId,
      TransactionType.REFERRAL_BONUS,
      referral.referredBonus,
      orderId,
      'Bono de bienvenida por referido',
    );

    const monthEarned = await this.getMonthlyReferralEarnings(
      referral.referrerId,
    );
    if (monthEarned + REFERRAL_BONUS_REFERRER <= REFERRAL_MONTHLY_CAP) {
      await walletsService.deposit(
        referral.referrerId,
        { amount: referral.referrerBonus },
        `ref_${orderId}`,
      );
      await this.createTransaction(
        referral.referrerId,
        TransactionType.REFERRAL_BONUS,
        referral.referrerBonus,
        orderId,
        'Bono por invitar a un amigo',
      );
    }
  }

  async getStats(userId: string): Promise<any> {
    const referralCode = await this.getUserReferralCode(userId);

    const invitedCount = await this.referralModel
      .countDocuments({ referrerId: userId, ...softDeleteCondition(false) })
      .exec();
    const completedCount = await this.referralModel
      .countDocuments({
        referrerId: userId,
        firstOrderCompleted: true,
        ...softDeleteCondition(false),
      })
      .exec();
    const totalEarned = await this.getTotalReferralEarnings(userId);
    const monthEarned = await this.getMonthlyReferralEarnings(userId);

    return {
      referralCode,
      invitedCount,
      completedCount,
      totalEarned,
      monthEarned,
    };
  }

  private async createTransaction(
    userId: string,
    type: string,
    amount: number,
    orderId: string,
    description: string,
  ): Promise<void> {
    const walletModel = this.connection.model('Wallet');
    const wallet = await walletModel.findOne({ userId }).exec();
    if (!wallet) return;
    const transactionModel = this.connection.model('Transaction');
    await transactionModel.create({
      walletId: String(wallet._id),
      type,
      amount,
      orderId,
      description,
    });
  }

  private async getUserReferralCode(userId: string): Promise<string | null> {
    const user = await this.connection.model('User').findById(userId).exec();
    return user?.referralCode || null;
  }

  private async getTotalReferralEarnings(userId: string): Promise<number> {
    const wallet = await this.connection
      .model('Wallet')
      .findOne({ userId })
      .exec();
    if (!wallet) return 0;
    const txns = await this.connection
      .model('Transaction')
      .find({ walletId: String(wallet._id), type: 'referral_bonus' })
      .exec();
    return txns.reduce((sum: number, t: any) => sum + t.amount, 0);
  }

  private async getMonthlyReferralEarnings(userId: string): Promise<number> {
    const wallet = await this.connection
      .model('Wallet')
      .findOne({ userId })
      .exec();
    if (!wallet) return 0;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const txns = await this.connection
      .model('Transaction')
      .find({
        walletId: String(wallet._id),
        type: 'referral_bonus',
        createdAt: { $gte: startOfMonth },
      })
      .exec();
    return txns.reduce((sum: number, t: any) => sum + t.amount, 0);
  }

  private getWalletsService(): any {
    return {
      deposit: async (userId: string, dto: { amount: number }, ref: string) => {
        const walletModel = this.connection.model('Wallet');
        const transactionModel = this.connection.model('Transaction');
        let wallet = await walletModel.findOne({ userId }).exec();
        if (!wallet) {
          wallet = await walletModel.create({ userId });
        }
        wallet.balance += dto.amount;
        await wallet.save();
        await transactionModel.create({
          walletId: String(wallet._id),
          type: 'referral_bonus',
          amount: dto.amount,
          paymentReference: ref,
          description: 'Bono de referido',
        });
      },
    };
  }
}
