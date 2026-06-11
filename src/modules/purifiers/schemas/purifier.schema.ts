import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'purifiers' })
export class Purifier {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  ownerId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  })
  location: Record<string, any>;

  @Prop()
  schedule?: string;

  @Prop()
  phone?: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop()
  description?: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WaterType' }],
    default: [],
  })
  waterTypeIds: string[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BottleSize' }],
    default: [],
  })
  bottleSizeIds: string[];

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  avgRating: number;

  @Prop({ default: 0 })
  ratingsCount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const PurifierSchema =
  SchemaFactory.createForClass(Purifier).add(BaseSchema);
PurifierSchema.index({ location: '2dsphere' });
