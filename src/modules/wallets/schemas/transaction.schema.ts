import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'transactions' })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true })
  walletId: string;

  @Prop({
    type: String,
    enum: [
      'deposit',
      'payment',
      'earning',
      'commission',
      'withdrawal',
      'referral_bonus',
      'points_redemption',
      'refund',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  orderId?: string;

  @Prop()
  paymentReference?: string;

  @Prop()
  description?: string;
}

export const TransactionSchema =
  SchemaFactory.createForClass(Transaction).add(BaseSchema);
TransactionSchema.index({ walletId: 1, createdAt: -1 });
