import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'orderstatushistories' })
export class OrderStatusHistory {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId: string;

  @Prop()
  fromStatus?: string;

  @Prop({ required: true })
  toStatus: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  changedBy: string;
}

export const OrderStatusHistorySchema =
  SchemaFactory.createForClass(OrderStatusHistory).add(BaseSchema);
OrderStatusHistorySchema.index({ orderId: 1, createdAt: 1 });
