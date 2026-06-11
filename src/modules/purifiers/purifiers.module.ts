import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurifiersController } from './purifiers.controller';
import { PurifiersService } from './purifiers.service';
import { Purifier, PurifierSchema } from './schemas/purifier.schema';
import {
  PurifierPrice,
  PurifierPriceSchema,
} from './schemas/purifier-price.schema';
import {
  PurifierDeliveryLink,
  PurifierDeliveryLinkSchema,
} from './schemas/purifier-delivery-link.schema';
import { Rating, RatingSchema } from './schemas/rating.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Purifier.name, schema: PurifierSchema },
      { name: PurifierPrice.name, schema: PurifierPriceSchema },
      { name: PurifierDeliveryLink.name, schema: PurifierDeliveryLinkSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
  controllers: [PurifiersController],
  providers: [PurifiersService],
  exports: [PurifiersService],
})
export class PurifiersModule {}
