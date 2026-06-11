import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import {
  SubscriptionFrequency,
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

@Schema({ collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Purifier' })
  purifierId?: string;

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

  @Prop({ type: String, enum: SubscriptionFrequency, required: true })
  frequency: string;

  @Prop({ type: Number, min: 0, max: 6 })
  dayOfWeek?: number;

  @Prop()
  hour?: string;

  @Prop({ type: DeliveryAddress })
  deliveryAddress?: DeliveryAddress;

  @Prop({ type: String, enum: PaymentMethod, default: 'cash' })
  paymentMethod: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPaused: boolean;

  @Prop()
  lastGeneratedAt?: Date;

  @Prop()
  nextOrderAt?: Date;
}

export const SubscriptionSchema =
  SchemaFactory.createForClass(Subscription).add(BaseSchema);
SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ purifierId: 1 });
SubscriptionSchema.index({ nextOrderAt: 1 });
