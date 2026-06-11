import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { CashEntryType } from '../../../common/interfaces/enums';

class CashEntry {
  @Prop({ type: String, enum: CashEntryType, required: true })
  type: string;

  @Prop({ required: true })
  concept: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

@Schema({ collection: 'cashregisters' })
export class CashRegister {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purifier',
    required: true,
  })
  purifierId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  openingBalance: number;

  @Prop({ type: [CashEntry], default: [] })
  entries: CashEntry[];

  @Prop({ type: Number, default: null })
  closingBalance?: number;

  @Prop({ default: false })
  isClosed: boolean;
}

export const CashRegisterSchema =
  SchemaFactory.createForClass(CashRegister).add(BaseSchema);
CashRegisterSchema.index({ purifierId: 1, date: 1 }, { unique: true });
