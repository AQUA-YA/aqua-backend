import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryController } from './delivery.controller';
import { KycAdminController } from './kyc-admin.controller';
import { DeliveryService } from './delivery.service';
import {
  DeliveryProfile,
  DeliveryProfileSchema,
} from './schemas/delivery-profile.schema';
import {
  DeliveryInventory,
  DeliveryInventorySchema,
} from './schemas/delivery-inventory.schema';
import {
  DeliveryPrice,
  DeliveryPriceSchema,
} from './schemas/delivery-price.schema';
import {
  KycVerification,
  KycVerificationSchema,
} from './schemas/kyc-verification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryProfile.name, schema: DeliveryProfileSchema },
      { name: DeliveryInventory.name, schema: DeliveryInventorySchema },
      { name: DeliveryPrice.name, schema: DeliveryPriceSchema },
      { name: KycVerification.name, schema: KycVerificationSchema },
    ]),
  ],
  controllers: [DeliveryController, KycAdminController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
