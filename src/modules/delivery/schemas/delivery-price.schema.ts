import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'deliveryprices' })
export class DeliveryPrice {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  deliveryUserId: string;

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

  @Prop({ required: true })
  price: number;
}

export const DeliveryPriceSchema =
  SchemaFactory.createForClass(DeliveryPrice).add(BaseSchema);
DeliveryPriceSchema.index(
  { deliveryUserId: 1, waterTypeId: 1, bottleSizeId: 1 },
  { unique: true },
);
