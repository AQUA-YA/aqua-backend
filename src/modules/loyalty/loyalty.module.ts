import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import {
  LoyaltyEntry,
  LoyaltyEntrySchema,
} from './schemas/loyalty-entry.schema';
import {
  LoyaltyEvent,
  LoyaltyEventSchema,
} from './schemas/loyalty-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoyaltyEntry.name, schema: LoyaltyEntrySchema },
      { name: LoyaltyEvent.name, schema: LoyaltyEventSchema },
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService, MongooseModule],
})
export class LoyaltyModule {}
