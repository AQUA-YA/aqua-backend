import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { CouponType } from '../../../common/interfaces/enums';

@Schema({ collection: 'coupons' })
export class Coupon {
  @Prop({ uppercase: true, sparse: true })
  code?: string;

  @Prop({ type: String, enum: CouponType, required: true })
  type: string;

  @Prop({ required: true })
  value: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    default: null,
  })
  purifierId?: string;

  @Prop({ type: Number, default: null })
  maxUses?: number;

  @Prop({ default: 1 })
  maxUsesPerUser: number;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isWelcome: boolean;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;
}

export const CouponSchema =
  SchemaFactory.createForClass(Coupon).add(BaseSchema);
