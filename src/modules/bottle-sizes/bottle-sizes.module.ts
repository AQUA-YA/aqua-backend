import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BottleSizesController } from './bottle-sizes.controller';
import { BottleSizesService } from './bottle-sizes.service';
import { BottleSize, BottleSizeSchema } from './schemas/bottle-size.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BottleSize.name, schema: BottleSizeSchema },
    ]),
  ],
  controllers: [BottleSizesController],
  providers: [BottleSizesService],
  exports: [BottleSizesService],
})
export class BottleSizesModule {}
