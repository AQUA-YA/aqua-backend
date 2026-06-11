import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { ChatMessageType } from '../../../common/interfaces/enums';

@Schema({ collection: 'chatmessages' })
export class ChatMessage {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  senderId: string;

  @Prop({ type: String, enum: ['consumer', 'delivery'], required: true })
  senderRole: string;

  @Prop({ type: String, enum: ChatMessageType, default: 'text' })
  messageType: string;

  @Prop({ required: true })
  content: string;
}

export const ChatMessageSchema =
  SchemaFactory.createForClass(ChatMessage).add(BaseSchema);
ChatMessageSchema.index({ orderId: 1, createdAt: 1 });
