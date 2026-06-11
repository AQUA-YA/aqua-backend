import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { CommissionType } from '../../../common/interfaces/enums';

@Schema({ collection: 'commissionconfigs' })
export class CommissionConfig {
  @Prop({ required: true, enum: CommissionType })
  type: string;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: string;
}

export const CommissionConfigSchema =
  SchemaFactory.createForClass(CommissionConfig).add(BaseSchema);
