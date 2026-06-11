import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { StoreSalePaymentMethod } from '../../../common/interfaces/enums';

@Schema({ collection: 'storesales' })
export class StoreSale {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    required: true,
  })
  purifierId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WaterType',
    required: true,
  })
  waterTypeId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BottleSize',
    required: true,
  })
  bottleSizeId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  total: number;

  @Prop({ type: String, enum: StoreSalePaymentMethod, required: true })
  paymentMethod: string;

  @Prop({ type: String, enum: ['app', 'local'], default: 'local' })
  source: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
  orderId?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;
}

export const StoreSaleSchema =
  SchemaFactory.createForClass(StoreSale).add(BaseSchema);
