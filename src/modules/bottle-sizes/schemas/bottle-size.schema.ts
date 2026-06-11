import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'bottlesizes' })
export class BottleSize {
  @Prop({ required: true, unique: true })
  liters: number;

  @Prop()
  name?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BottleSizeSchema =
  SchemaFactory.createForClass(BottleSize).add(BaseSchema);
