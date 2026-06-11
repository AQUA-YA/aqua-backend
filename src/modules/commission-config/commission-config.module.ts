import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionConfigController } from './commission-config.controller';
import { CommissionConfigService } from './commission-config.service';
import {
  CommissionConfig,
  CommissionConfigSchema,
} from './schemas/commission-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommissionConfig.name, schema: CommissionConfigSchema },
    ]),
  ],
  controllers: [CommissionConfigController],
  providers: [CommissionConfigService],
  exports: [CommissionConfigService],
})
export class CommissionConfigModule {}
