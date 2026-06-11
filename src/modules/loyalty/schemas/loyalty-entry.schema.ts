import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { LoyaltyEntryType } from '../../../common/interfaces/enums';

@Schema({ collection: 'loyaltyentries' })
export class LoyaltyEntry {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
  orderId?: string;

  @Prop({ type: String, enum: LoyaltyEntryType, required: true })
  type: string;

  @Prop({ required: true, min: 1 })
  points: number;

  @Prop({ required: true, min: 0 })
  remainingPoints: number;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const LoyaltyEntrySchema =
  SchemaFactory.createForClass(LoyaltyEntry).add(BaseSchema);
LoyaltyEntrySchema.index({ userId: 1, createdAt: 1 });
