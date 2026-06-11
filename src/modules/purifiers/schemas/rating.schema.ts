import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'ratings' })
export class Rating {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    required: true,
  })
  purifierId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  comment?: string;
}

export const RatingSchema =
  SchemaFactory.createForClass(Rating).add(BaseSchema);
RatingSchema.index({ userId: 1, orderId: 1 }, { unique: true });
