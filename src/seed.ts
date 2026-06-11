import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { customAlphabet } from 'nanoid';
import {
  Role,
  OrderStatus,
  CommissionType,
  KycStatus,
  SubscriptionFrequency,
  PaymentMethod,
  CouponType,
} from './common/interfaces/enums';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const models = [
    'User',
    'Purifier',
    'PurifierPrice',
    'PurifierDeliveryLink',
    'DeliveryProfile',
    'DeliveryInventory',
    'DeliveryPrice',
    'WaterType',
    'BottleSize',
    'Order',
    'OrderStatusHistory',
    'Wallet',
    'Transaction',
    'Rating',
    'CommissionConfig',
    'InventoryItem',
    'InventoryMovement',
    'StoreSale',
    'CashRegister',
    'Subscription',
    'Coupon',
    'Referral',
    'LoyaltyEntry',
    'LoyaltyEvent',
    'SupportTicket',
    'NotificationToken',
    'KycVerification',
    'ChatMessage',
  ];

  for (const name of models) {
    try {
      const model = app.get(getModelToken(name), { strict: false });
      await model.deleteMany({}).exec();
      console.log(`Cleared ${name}`);
    } catch {
      console.log(`Skipped ${name} (not registered)`);
    }
  }

  // Create admin
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await app.get(getModelToken('User')).create({
    email: 'admin@aquaya.mx',
    passwordHash: adminPassword,
    firstName: 'Admin',
    lastName: 'AquaYa',
    roles: [Role.ADMIN],
    isVerified: true,
    referralCode: 'AQUA-ADMIN01',
  });
  console.log('Admin created:', admin.email);

  // Create water types
  const WaterTypeModel = app.get(getModelToken('WaterType'));
  const waterTypes = await WaterTypeModel.insertMany([
    {
      name: 'Purificada',
      description: 'Agua purificada de alta calidad',
      isActive: true,
    },
    {
      name: 'Alcalina',
      description: 'Agua alcalina con pH balanceado',
      isActive: true,
    },
    { name: 'Light', description: 'Agua light baja en sodio', isActive: true },
    {
      name: 'Saborizada',
      description: 'Agua saborizada natural',
      isActive: true,
    },
  ]);
  console.log('Water types created:', waterTypes.length);

  // Create bottle sizes
  const BottleSizeModel = app.get(getModelToken('BottleSize'));
  const bottleSizes = await BottleSizeModel.insertMany([
    { liters: 10, name: 'Garrafón 10L', isActive: true },
    { liters: 20, name: 'Garrafón 20L', isActive: true },
    { liters: 5, name: 'Botella 5L', isActive: true },
    { liters: 1, name: 'Botella 1L', isActive: true },
  ]);
  console.log('Bottle sizes created:', bottleSizes.length);

  // Create commission config
  const CommissionConfigModel = app.get(getModelToken('CommissionConfig'));
  await CommissionConfigModel.create({
    type: CommissionType.PERCENTAGE,
    value: 3,
    updatedBy: admin._id,
  });
  console.log('Commission config created');

  // Create consumers
  const consumerPass = await bcrypt.hash('Consumer123!', 10);
  const consumer1 = await app.get(getModelToken('User')).create({
    email: 'consumer1@example.com',
    passwordHash: consumerPass,
    firstName: 'Juan',
    lastName: 'Pérez',
    roles: [Role.CONSUMER],
    isVerified: true,
    referralCode: 'AQUA-CON1',
    addresses: [
      {
        alias: 'Casa',
        street: 'Av. Reforma 123',
        neighborhood: 'Juárez',
        city: 'Ciudad de México',
        zipCode: '06600',
        isPrimary: true,
        location: { type: 'Point', coordinates: [-99.1332, 19.4326] },
      },
    ],
  });
  const consumer2 = await app.get(getModelToken('User')).create({
    email: 'consumer2@example.com',
    passwordHash: consumerPass,
    firstName: 'María',
    lastName: 'García',
    roles: [Role.CONSUMER],
    isVerified: true,
    referralCode: 'AQUA-CON2',
  });
  console.log('Consumers created');

  // Create purifier owner
  const purifierPass = await bcrypt.hash('Purifier123!', 10);
  const purifierUser = await app.get(getModelToken('User')).create({
    email: 'purifier@example.com',
    passwordHash: purifierPass,
    firstName: 'Carlos',
    lastName: 'Sánchez',
    roles: [Role.PURIFIER],
    isVerified: true,
    referralCode: 'AQUA-PURI',
  });

  // Create purifiers
  const PurifierModel = app.get(getModelToken('Purifier'));
  const purifier1 = await PurifierModel.create({
    ownerId: purifierUser._id,
    name: 'Agua Pura CDMX Centro',
    address: 'Calle 5 de Mayo 100, Centro',
    location: { type: 'Point', coordinates: [-99.1352, 19.4342] },
    schedule: 'L-S 8:00-20:00',
    phone: '5551234567',
    description: 'Purificadora de agua en el centro de la CDMX',
    waterTypeIds: [waterTypes[0]._id, waterTypes[1]._id],
    bottleSizeIds: [bottleSizes[0]._id, bottleSizes[1]._id],
    deliveryFee: 15,
    isActive: true,
  });
  const purifier2 = await PurifierModel.create({
    ownerId: purifierUser._id,
    name: 'Agua Pura CDMX Norte',
    address: 'Av. Insurgentes Norte 500',
    location: { type: 'Point', coordinates: [-99.1462, 19.4542] },
    schedule: 'L-S 9:00-19:00',
    phone: '5557654321',
    description: 'Purificadora de agua al norte de la CDMX',
    waterTypeIds: [waterTypes[0]._id, waterTypes[2]._id],
    bottleSizeIds: [bottleSizes[0]._id, bottleSizes[1]._id, bottleSizes[2]._id],
    deliveryFee: 20,
    isActive: true,
  });
  console.log('Purifiers created');

  // Create purifier prices
  const PurifierPriceModel = app.get(getModelToken('PurifierPrice'));
  await PurifierPriceModel.insertMany([
    {
      purifierId: purifier1._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[0]._id,
      price: 35,
    },
    {
      purifierId: purifier1._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[1]._id,
      price: 50,
    },
    {
      purifierId: purifier1._id,
      waterTypeId: waterTypes[1]._id,
      bottleSizeId: bottleSizes[0]._id,
      price: 45,
    },
    {
      purifierId: purifier1._id,
      waterTypeId: waterTypes[1]._id,
      bottleSizeId: bottleSizes[1]._id,
      price: 65,
    },
    {
      purifierId: purifier2._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[0]._id,
      price: 33,
    },
    {
      purifierId: purifier2._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[1]._id,
      price: 48,
    },
    {
      purifierId: purifier2._id,
      waterTypeId: waterTypes[2]._id,
      bottleSizeId: bottleSizes[0]._id,
      price: 38,
    },
    {
      purifierId: purifier2._id,
      waterTypeId: waterTypes[2]._id,
      bottleSizeId: bottleSizes[2]._id,
      price: 25,
    },
  ]);
  console.log('Purifier prices created');

  // Create inventory items
  const InventoryItemModel = app.get(getModelToken('InventoryItem'));
  await InventoryItemModel.insertMany([
    {
      purifierId: purifier1._id,
      bottleSizeId: bottleSizes[0]._id,
      availableQuantity: 100,
      availableSeals: 100,
      lowStockThreshold: 10,
    },
    {
      purifierId: purifier1._id,
      bottleSizeId: bottleSizes[1]._id,
      availableQuantity: 50,
      availableSeals: 50,
      lowStockThreshold: 10,
    },
    {
      purifierId: purifier2._id,
      bottleSizeId: bottleSizes[0]._id,
      availableQuantity: 80,
      availableSeals: 80,
      lowStockThreshold: 10,
    },
    {
      purifierId: purifier2._id,
      bottleSizeId: bottleSizes[1]._id,
      availableQuantity: 40,
      availableSeals: 40,
      lowStockThreshold: 10,
    },
  ]);
  console.log('Inventory created');

  // Create delivery users
  const deliveryPass = await bcrypt.hash('Delivery123!', 10);
  const linkedDeliveryUser = await app.get(getModelToken('User')).create({
    email: 'delivery-linked@example.com',
    passwordHash: deliveryPass,
    firstName: 'Pedro',
    lastName: 'López',
    roles: [Role.DELIVERY],
    isVerified: true,
    referralCode: 'AQUA-DEL1',
  });
  const independentDeliveryUser = await app.get(getModelToken('User')).create({
    email: 'delivery-independent@example.com',
    passwordHash: deliveryPass,
    firstName: 'Luis',
    lastName: 'Martínez',
    roles: [Role.DELIVERY],
    isVerified: true,
    referralCode: 'AQUA-DEL2',
  });

  // Create delivery profiles
  const DeliveryProfileModel = app.get(getModelToken('DeliveryProfile'));
  await DeliveryProfileModel.insertMany([
    {
      userId: linkedDeliveryUser._id,
      hasOwnInventory: false,
      isAvailable: true,
      deliveryFee: 0,
      qrToken: customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12)(),
      kycStatus: KycStatus.APPROVED,
    },
    {
      userId: independentDeliveryUser._id,
      hasOwnInventory: true,
      isAvailable: true,
      deliveryFee: 10,
      qrToken: customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12)(),
      kycStatus: KycStatus.APPROVED,
    },
  ]);
  console.log('Delivery profiles created');

  // Create delivery links
  const DeliveryLinkModel = app.get(getModelToken('PurifierDeliveryLink'));
  await DeliveryLinkModel.create({
    purifierId: purifier1._id,
    deliveryUserId: linkedDeliveryUser._id,
    shift: 'full',
  });

  // Create delivery inventory (for independent)
  const DeliveryInventoryModel = app.get(getModelToken('DeliveryInventory'));
  await DeliveryInventoryModel.insertMany([
    {
      deliveryUserId: independentDeliveryUser._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[0]._id,
      quantity: 20,
    },
    {
      deliveryUserId: independentDeliveryUser._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[1]._id,
      quantity: 10,
    },
  ]);

  // Create delivery prices (for independent)
  const DeliveryPriceModel = app.get(getModelToken('DeliveryPrice'));
  await DeliveryPriceModel.insertMany([
    {
      deliveryUserId: independentDeliveryUser._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[0]._id,
      price: 40,
    },
    {
      deliveryUserId: independentDeliveryUser._id,
      waterTypeId: waterTypes[0]._id,
      bottleSizeId: bottleSizes[1]._id,
      price: 55,
    },
  ]);
  console.log('Delivery data created');

  // Create wallets
  const WalletModel = app.get(getModelToken('Wallet'));
  await WalletModel.insertMany([
    { userId: consumer1._id, balance: 500, blockedBalance: 0, debtBalance: 0 },
    { userId: consumer2._id, balance: 200, blockedBalance: 0, debtBalance: 0 },
    {
      userId: purifierUser._id,
      balance: 1000,
      blockedBalance: 0,
      debtBalance: 0,
    },
    {
      userId: linkedDeliveryUser._id,
      balance: 300,
      blockedBalance: 0,
      debtBalance: 0,
    },
    {
      userId: independentDeliveryUser._id,
      balance: 150,
      blockedBalance: 0,
      debtBalance: 0,
    },
  ]);
  console.log('Wallets created');

  // Create a global coupon
  const CouponModel = app.get(getModelToken('Coupon'));
  await CouponModel.create({
    code: 'BIENVENIDO10',
    type: CouponType.AMOUNT,
    value: 10,
    maxUses: 100,
    maxUsesPerUser: 1,
    startsAt: new Date('2024-01-01'),
    endsAt: new Date('2026-12-31'),
    isActive: true,
    createdBy: admin._id,
  });
  console.log('Coupon created');

  // Create subscription
  const SubscriptionModel = app.get(getModelToken('Subscription'));
  const nextOrder = new Date();
  nextOrder.setDate(nextOrder.getDate() + 1);
  await SubscriptionModel.create({
    userId: consumer1._id,
    purifierId: purifier1._id,
    waterTypeId: waterTypes[0]._id,
    bottleSizeId: bottleSizes[0]._id,
    quantity: 2,
    frequency: SubscriptionFrequency.WEEKLY,
    dayOfWeek: 1,
    hour: '10:00',
    deliveryAddress: {
      alias: 'Casa',
      street: 'Av. Reforma 123',
      neighborhood: 'Juárez',
      city: 'Ciudad de México',
      zipCode: '06600',
      isPrimary: true,
      location: { type: 'Point', coordinates: [-99.1332, 19.4326] },
    },
    paymentMethod: PaymentMethod.WALLET,
    isActive: true,
    nextOrderAt: nextOrder,
  });
  console.log('Subscription created');

  console.log('\n--- Seed completed ---');
  console.log('Admin: admin@aquaya.mx / Admin123!');
  console.log('Consumer: consumer1@example.com / Consumer123!');
  console.log('Purifier: purifier@example.com / Purifier123!');
  console.log('Delivery: delivery-linked@example.com / Delivery123!');
  console.log('Delivery: delivery-independent@example.com / Delivery123!');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
