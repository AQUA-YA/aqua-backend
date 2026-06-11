import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'purifierprices' })
export class PurifierPrice {
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

  @Prop({ required: true })
  price: number;
}

export const PurifierPriceSchema =
  SchemaFactory.createForClass(PurifierPrice).add(BaseSchema);
PurifierPriceSchema.index(
  { purifierId: 1, waterTypeId: 1, bottleSizeId: 1 },
  { unique: true },
);
