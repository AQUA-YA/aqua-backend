import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { InventoryMovementType } from '../../../common/interfaces/enums';

@Schema({ collection: 'inventorymovements' })
export class InventoryMovement {
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

  @Prop({ type: String, enum: InventoryMovementType, required: true })
  type: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ default: 0 })
  seals: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;
}

export const InventoryMovementSchema =
  SchemaFactory.createForClass(InventoryMovement).add(BaseSchema);
