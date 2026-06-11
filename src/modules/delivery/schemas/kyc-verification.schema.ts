import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema';

@Schema({ collection: 'kycverifications' })
export class KycVerification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop()
  idPhotoUrl?: string;

  @Prop()
  selfieUrl?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  reviewedBy?: string;
}

export const KycVerificationSchema =
  SchemaFactory.createForClass(KycVerification).add(BaseSchema);
