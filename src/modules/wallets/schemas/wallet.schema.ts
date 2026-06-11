import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'wallets' })
export class Wallet {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: string;

  @Prop({ default: 0, min: 0 })
  balance: number;

  @Prop({ default: 0, min: 0 })
  blockedBalance: number;

  @Prop({ default: 0, min: 0 })
  debtBalance: number;
}

export const WalletSchema =
  SchemaFactory.createForClass(Wallet).add(BaseSchema);
