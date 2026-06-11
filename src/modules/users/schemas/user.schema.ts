import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';
import { Role, Gender } from '../../../common/interfaces/enums';

class Address {
  @Prop({ required: true })
  alias: string;

  @Prop({ required: true })
  street: string;

  @Prop()
  neighborhood?: string;

  @Prop()
  city?: string;

  @Prop()
  zipCode?: string;

  @Prop()
  reference?: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  })
  location?: {
    type: string;
    coordinates: number[];
  };

  @Prop({ default: false })
  isPrimary?: boolean;
}

@Schema({ collection: 'users' })
export class User {
  @Prop({ required: true, lowercase: true, unique: true })
  email: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ enum: Gender })
  gender?: string;

  @Prop({ type: [String], enum: Role, default: ['consumer'] })
  roles: string[];

  @Prop()
  avatarUrl?: string;

  @Prop({ type: [Address], default: [] })
  addresses: Address[];

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ select: false })
  verificationCode?: string;

  @Prop({ select: false })
  verificationCodeExpiresAt?: Date;

  @Prop({ unique: true, sparse: true })
  referralCode?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  referredBy?: string;

  @Prop({ default: false })
  isSuspended: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User).add(BaseSchema);
