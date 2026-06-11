import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { StoreSalesController } from './store-sales.controller';
import { CashRegistersController } from './cash-registers.controller';
import { ReportsController } from './reports.controller';
import { PurifierBusinessService } from './purifier-business.service';
import {
  InventoryItem,
  InventoryItemSchema,
} from './schemas/inventory-item.schema';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from './schemas/inventory-movement.schema';
import { StoreSale, StoreSaleSchema } from './schemas/store-sale.schema';
import {
  CashRegister,
  CashRegisterSchema,
} from './schemas/cash-register.schema';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: StoreSale.name, schema: StoreSaleSchema },
      { name: CashRegister.name, schema: CashRegisterSchema },
    ]),
    forwardRef(() => WalletsModule),
  ],
  controllers: [
    InventoryController,
    StoreSalesController,
    CashRegistersController,
    ReportsController,
  ],
  providers: [PurifierBusinessService],
  exports: [PurifierBusinessService],
})
export class PurifierBusinessModule {}
