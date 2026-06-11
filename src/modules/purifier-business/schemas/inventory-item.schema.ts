import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'inventoryitems' })
export class InventoryItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    required: true,
  })
  purifierId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BottleSize',
    required: true,
  })
  bottleSizeId: string;

  @Prop({ required: true, min: 0 })
  availableQuantity: number;

  @Prop({ required: true, min: 0 })
  availableSeals: number;

  @Prop({ default: 10 })
  lowStockThreshold: number;
}

export const InventoryItemSchema =
  SchemaFactory.createForClass(InventoryItem).add(BaseSchema);
InventoryItemSchema.index({ purifierId: 1, bottleSizeId: 1 }, { unique: true });
