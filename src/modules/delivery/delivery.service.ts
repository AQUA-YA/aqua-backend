import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryProfile } from './schemas/delivery-profile.schema';
import { DeliveryInventory } from './schemas/delivery-inventory.schema';
import { DeliveryPrice } from './schemas/delivery-price.schema';
import { KycVerification } from './schemas/kyc-verification.schema';
import {
  UpdateDeliveryProfileDto,
  UpdateAvailabilityDto,
  DeliveryInventoryItemDto,
  DeliveryPriceItemDto,
  SubmitKycDto,
  AdminReviewKycDto,
} from './dto/delivery.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import {
  STORAGE_PROVIDER,
  PUSH_PROVIDER,
} from '../../providers/providers.module';
import type {
  StorageProvider,
  PushProvider,
} from '../../providers/providers.module';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(DeliveryProfile.name)
    private readonly profileModel: Model<DeliveryProfile>,
    @InjectModel(DeliveryInventory.name)
    private readonly inventoryModel: Model<DeliveryInventory>,
    @InjectModel(DeliveryPrice.name)
    private readonly priceModel: Model<DeliveryPrice>,
    @InjectModel(KycVerification.name)
    private readonly kycModel: Model<KycVerification>,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile)
      throw new NotFoundException('Perfil de repartidor no encontrado');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateDeliveryProfileDto) {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile)
      throw new NotFoundException('Perfil de repartidor no encontrado');
    Object.assign(profile, dto);
    return profile.save();
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile)
      throw new NotFoundException('Perfil de repartidor no encontrado');
    profile.isAvailable = dto.isAvailable;
    return profile.save();
  }

  async getInventory(userId: string) {
    return this.inventoryModel.find({ deliveryUserId: userId }).exec();
  }

  async upsertInventory(userId: string, items: DeliveryInventoryItemDto[]) {
    const bulkOps: any[] = items.map((item) => ({
      updateOne: {
        filter: {
          deliveryUserId: userId,
          waterTypeId: item.waterTypeId,
          bottleSizeId: item.bottleSizeId,
        },
        update: { $set: { quantity: item.quantity } },
        upsert: true,
      },
    }));
    await this.inventoryModel.bulkWrite(bulkOps);
    return this.inventoryModel.find({ deliveryUserId: userId }).exec();
  }

  async getPrices(userId: string) {
    return this.priceModel.find({ deliveryUserId: userId }).exec();
  }

  async upsertPrices(userId: string, items: DeliveryPriceItemDto[]) {
    const bulkOps: any[] = items.map((item) => ({
      updateOne: {
        filter: {
          deliveryUserId: userId,
          waterTypeId: item.waterTypeId,
          bottleSizeId: item.bottleSizeId,
        },
        update: { $set: { price: item.price } },
        upsert: true,
      },
    }));
    await this.priceModel.bulkWrite(bulkOps);
    return this.priceModel.find({ deliveryUserId: userId }).exec();
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    const idPhotoResult = await this.storageProvider.upload(
      dto.idPhoto,
      'kyc/id',
    );
    const selfieResult = await this.storageProvider.upload(
      dto.selfie,
      'kyc/selfie',
    );
    const kyc = await this.kycModel.create({
      userId,
      idPhotoUrl: idPhotoResult.url,
      selfieUrl: selfieResult.url,
      status: 'pending',
    });
    await this.profileModel
      .updateOne({ userId }, { kycStatus: 'pending' })
      .exec();
    await this.pushProvider.send(
      [],
      'Nueva verificación KYC',
      `Usuario ${userId} ha enviado sus documentos`,
    );
    return kyc;
  }

  async getKycStatus(userId: string) {
    const kyc = await this.kycModel
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();
    if (!kyc) throw new NotFoundException('No has enviado documentos KYC');
    return kyc;
  }

  async getQrToken(userId: string) {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile)
      throw new NotFoundException('Perfil de repartidor no encontrado');
    if (profile.kycStatus !== 'approved') {
      throw new ForbiddenException(
        'Debes completar tu verificación de identidad',
      );
    }
    if (!profile.qrToken) {
      const { nanoid } = await import('nanoid');
      profile.qrToken = nanoid(12);
      await profile.save();
    }
    return { qrToken: profile.qrToken };
  }

  async verifyQr(qrToken: string) {
    const profile = await this.profileModel.findOne({ qrToken }).exec();
    if (!profile || profile.kycStatus !== 'approved') {
      throw new NotFoundException('Código QR inválido');
    }
    return profile;
  }

  async getDeliveries(
    userId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { acceptedById: userId, ...softDeleteCondition(false) };
    const OrderModel = this.profileModel.db.model('Order');
    const [data, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      OrderModel.countDocuments(filter).exec(),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async listKycVerifications(
    query: PaginationDto & { status?: string },
  ): Promise<PaginatedResult<KycVerification>> {
    const { page = 1, limit = 20, status } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { ...softDeleteCondition(false) };
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.kycModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.kycModel.countDocuments(filter).exec(),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async reviewKyc(kycId: string, dto: AdminReviewKycDto, reviewerId: string) {
    const kyc = await this.kycModel.findById(kycId).exec();
    if (!kyc) throw new NotFoundException('Verificación KYC no encontrada');
    kyc.status = dto.status;
    kyc.reviewedBy = reviewerId;
    if (dto.rejectionReason) kyc.rejectionReason = dto.rejectionReason;
    await kyc.save();
    await this.profileModel
      .updateOne({ userId: kyc.userId }, { kycStatus: dto.status })
      .exec();
    await this.pushProvider.send(
      [],
      'Estado de verificación KYC',
      `Tu verificación ha sido ${dto.status === 'approved' ? 'aprobada' : 'rechazada'}`,
    );
    return kyc;
  }
}
