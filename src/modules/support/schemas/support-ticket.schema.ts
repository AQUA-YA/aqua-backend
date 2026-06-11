import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { TicketStatus } from '../../../common/interfaces/enums';

@Schema({ collection: 'supporttickets' })
export class SupportTicket {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
  orderId?: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: String, enum: TicketStatus, default: 'open' })
  status: string;

  @Prop({ type: String, default: null })
  adminResponse?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  resolvedBy?: string;

  @Prop({ type: Date, default: null })
  closedAt?: Date;
}

export const SupportTicketSchema =
  SchemaFactory.createForClass(SupportTicket).add(BaseSchema);
