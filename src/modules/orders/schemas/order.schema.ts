import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import {
  OrderStatus,
  OrderMode,
  PaymentMethod,
} from '../../../common/interfaces/enums';

class AddressLocation {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[];
}

class DeliveryAddress {
  @Prop()
  alias?: string;

  @Prop({ required: true })
  street: string;

  @Prop()
  neighborhood?: string;

  @Prop({ required: true })
  city: string;

  @Prop()
  zipCode?: string;

  @Prop()
  reference?: string;

  @Prop({ type: AddressLocation })
  location?: AddressLocation;

  @Prop({ default: false })
  isPrimary: boolean;
}

@Schema({ collection: 'orders' })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  consumerId: string;

  @Prop({ type: String, enum: OrderMode, required: true })
  mode: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Purifier' })
  targetPurifierId?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  targetDeliveryUserId?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  acceptedById?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Purifier' })
  fulfillingPurifierId?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  assignedDeliveryUserId?: string;

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

  @Prop()
  unitPrice?: number;

  @Prop()
  subtotal?: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  tip: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' })
  couponId?: string;

  @Prop({ default: 0 })
  redeemedPoints: number;

  @Prop()
  total?: number;

  @Prop()
  estimatedMaxTotal?: number;

  @Prop({ default: 0 })
  blockedAmount: number;

  @Prop({ default: 0 })
  commissionAmount: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: string;

  @Prop({ type: String, enum: OrderStatus, default: 'pending' })
  status: string;

  @Prop({ type: DeliveryAddress })
  deliveryAddress?: DeliveryAddress;

  @Prop({ default: false })
  requiresEmptyPickup: boolean;

  @Prop({ default: false })
  emptyBottleReturned: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' })
  subscriptionId?: string;

  @Prop()
  cancellationReason?: string;

  @Prop({ default: false })
  notifiedTimeout: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order).add(BaseSchema);
OrderSchema.index({ 'deliveryAddress.location': '2dsphere' });
OrderSchema.index({ status: 1 });
OrderSchema.index({ consumerId: 1 });
OrderSchema.index({ acceptedById: 1 });
