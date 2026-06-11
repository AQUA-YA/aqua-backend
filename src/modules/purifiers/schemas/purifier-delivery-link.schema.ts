import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'purifierdeliverylinks' })
export class PurifierDeliveryLink {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    required: true,
  })
  purifierId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  deliveryUserId: string;

  @Prop({ type: String, enum: ['morning', 'evening', 'full'], default: null })
  shift?: string;
}

export const PurifierDeliveryLinkSchema =
  SchemaFactory.createForClass(PurifierDeliveryLink).add(BaseSchema);
PurifierDeliveryLinkSchema.index(
  { purifierId: 1, deliveryUserId: 1 },
  { unique: true },
);
