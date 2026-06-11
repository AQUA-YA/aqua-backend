import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WaterTypesController } from './water-types.controller';
import { WaterTypesService } from './water-types.service';
import { WaterType, WaterTypeSchema } from './schemas/water-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WaterType.name, schema: WaterTypeSchema },
    ]),
  ],
  controllers: [WaterTypesController],
  providers: [WaterTypesService],
  exports: [WaterTypesService],
})
export class WaterTypesModule {}
