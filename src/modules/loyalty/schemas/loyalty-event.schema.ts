import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'loyaltyevents' })
export class LoyaltyEvent {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  multiplier: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WaterType',
    default: null,
  })
  waterTypeId?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    default: null,
  })
  purifierId?: string;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;
}

export const LoyaltyEventSchema =
  SchemaFactory.createForClass(LoyaltyEvent).add(BaseSchema);
