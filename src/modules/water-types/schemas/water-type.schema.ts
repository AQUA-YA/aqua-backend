import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'watertypes' })
export class WaterType {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const WaterTypeSchema =
  SchemaFactory.createForClass(WaterType).add(BaseSchema);
