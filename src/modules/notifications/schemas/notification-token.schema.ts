import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'notificationtokens' })
export class NotificationToken {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: String, enum: ['ios', 'android'], required: true })
  platform: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationTokenSchema =
  SchemaFactory.createForClass(NotificationToken).add(BaseSchema);
