import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'referrals' })
export class Referral {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  referrerId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  referredId: string;

  @Prop({ required: true })
  codeUsed: string;

  @Prop({ default: 20 })
  referrerBonus: number;

  @Prop({ default: 20 })
  referredBonus: number;

  @Prop({ default: false })
  firstOrderCompleted: boolean;

  @Prop({ type: Date, default: null })
  bonusPaidAt?: Date;
}

export const ReferralSchema =
  SchemaFactory.createForClass(Referral).add(BaseSchema);
