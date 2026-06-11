import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'deliveryinventories' })
export class DeliveryInventory {
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

  @Prop({ required: true, min: 0 })
  quantity: number;
}

export const DeliveryInventorySchema =
  SchemaFactory.createForClass(DeliveryInventory).add(BaseSchema);
DeliveryInventorySchema.index(
  { deliveryUserId: 1, waterTypeId: 1, bottleSizeId: 1 },
  { unique: true },
);
