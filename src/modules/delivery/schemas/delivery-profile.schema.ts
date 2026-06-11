import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'deliveryprofiles' })
export class DeliveryProfile {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: string;

  @Prop({ default: false })
  hasOwnInventory: boolean;

  @Prop({ default: false })
  isAvailable: boolean;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ unique: true, sparse: true })
  qrToken?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  kycStatus: string;

  @Prop({
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  })
  currentLocation?: Record<string, any>;
}

export const DeliveryProfileSchema =
  SchemaFactory.createForClass(DeliveryProfile).add(BaseSchema);
DeliveryProfileSchema.index({ currentLocation: '2dsphere' });
