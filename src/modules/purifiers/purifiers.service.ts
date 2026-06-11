import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { Purifier } from './schemas/purifier.schema';
import { PurifierPrice } from './schemas/purifier-price.schema';
import { PurifierDeliveryLink } from './schemas/purifier-delivery-link.schema';
import { Rating } from './schemas/rating.schema';
import {
  CreatePurifierDto,
  UpdatePurifierDto,
  NearbyQueryDto,
  PurifierPriceItemDto,
  CreateRatingDto,
  CreateDeliveryLinkDto,
  UpdateDeliveryLinkDto,
} from './dto/purifier.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { DEFAULT_SEARCH_RADIUS_KM } from '../../common/constants/business.constants';

@Injectable()
export class PurifiersService {
  constructor(
    @InjectModel(Purifier.name) private readonly purifierModel: Model<Purifier>,
    @InjectModel(PurifierPrice.name)
    private readonly priceModel: Model<PurifierPrice>,
    @InjectModel(PurifierDeliveryLink.name)
    private readonly linkModel: Model<PurifierDeliveryLink>,
    @InjectModel(Rating.name) private readonly ratingModel: Model<Rating>,
  ) {}

  async create(dto: CreatePurifierDto, ownerId: string) {
    const { lat, lng, ...rest } = dto;
    return this.purifierModel.create({
      ...rest,
      ownerId,
      location: { type: 'Point', coordinates: [lng, lat] },
    });
  }

  async findMine(userId: string) {
    const filter: any = { ownerId: userId, ...softDeleteCondition(false) };
    return this.purifierModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findNearby(query: NearbyQueryDto) {
    const {
      lat,
      lng,
      radiusKm = DEFAULT_SEARCH_RADIUS_KM,
      waterTypeId,
      bottleSizeId,
      search,
    } = query;
    const radiusM = radiusKm * 1000;

    const pipeline: any[] = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: radiusM,
          spherical: true,
          query: { deletedAt: null, isActive: true },
        },
      },
      {
        $lookup: {
          from: 'purifierprices',
          localField: '_id',
          foreignField: 'purifierId',
          as: 'prices',
        },
      },
    ];

    if (waterTypeId) {
      pipeline.push({
        $match: { waterTypeIds: new mongoose.Types.ObjectId(waterTypeId) },
      });
    }
    if (bottleSizeId) {
      pipeline.push({
        $match: { bottleSizeIds: new mongoose.Types.ObjectId(bottleSizeId) },
      });
    }
    if (search) {
      pipeline.push({ $match: { name: { $regex: search, $options: 'i' } } });
    }

    return this.purifierModel.aggregate(pipeline).exec();
  }

  async findOne(id: string) {
    const purifier = await this.purifierModel.findById(id).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    return purifier;
  }

  async update(
    id: string,
    dto: UpdatePurifierDto,
    userId: string,
    userRoles: string[],
  ) {
    const purifier = await this.purifierModel.findById(id).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId && !userRoles.includes('admin')) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    const { lat, lng, ...rest } = dto;
    Object.assign(purifier, rest);
    if (lat !== undefined && lng !== undefined) {
      (purifier as any).location = { type: 'Point', coordinates: [lng, lat] };
    }
    return purifier.save();
  }

  async remove(id: string, userId: string, userRoles: string[]) {
    const purifier = await this.purifierModel.findById(id).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId && !userRoles.includes('admin')) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    (purifier as any).deletedAt = new Date();
    return purifier.save();
  }

  async findPrices(purifierId: string) {
    return this.priceModel.find({ purifierId }).exec();
  }

  async upsertPrices(
    purifierId: string,
    items: PurifierPriceItemDto[],
    userId: string,
  ) {
    const purifier = await this.purifierModel.findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    const waterTypeIds = purifier.waterTypeIds.map((id) => id.toString());
    const bottleSizeIds = purifier.bottleSizeIds.map((id) => id.toString());
    for (const item of items) {
      if (!waterTypeIds.includes(item.waterTypeId)) {
        throw new BadRequestException(
          `Tipo de agua ${item.waterTypeId} no disponible en esta purificadora`,
        );
      }
      if (!bottleSizeIds.includes(item.bottleSizeId)) {
        throw new BadRequestException(
          `Tamaño ${item.bottleSizeId} no disponible en esta purificadora`,
        );
      }
    }
    const bulkOps: any[] = items.map((item) => ({
      updateOne: {
        filter: {
          purifierId,
          waterTypeId: item.waterTypeId,
          bottleSizeId: item.bottleSizeId,
        },
        update: { $set: { price: item.price } },
        upsert: true,
      },
    }));
    await this.priceModel.bulkWrite(bulkOps);
    return this.priceModel.find({ purifierId }).exec();
  }

  async createRating(purifierId: string, dto: CreateRatingDto, userId: string) {
    const rating = await this.ratingModel.create({
      userId,
      purifierId,
      orderId: dto.orderId,
      score: dto.score,
      comment: dto.comment,
    });
    const stats = await this.ratingModel
      .aggregate([
        { $match: { purifierId: new mongoose.Types.ObjectId(purifierId) } },
        { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
      ])
      .exec();
    if (stats.length > 0) {
      await this.purifierModel
        .findByIdAndUpdate(purifierId, {
          avgRating: Math.round(stats[0].avg * 10) / 10,
          ratingsCount: stats[0].count,
        })
        .exec();
    }
    return rating;
  }

  async findRatings(
    purifierId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<Rating>> {
    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { purifierId, ...softDeleteCondition(false) };
    const [data, total] = await Promise.all([
      this.ratingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.ratingModel.countDocuments(filter).exec(),
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

  async createDeliveryLink(
    purifierId: string,
    dto: CreateDeliveryLinkDto,
    userId: string,
  ) {
    const purifier = await this.purifierModel.findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    return this.linkModel.create({
      purifierId,
      deliveryUserId: dto.deliveryUserId,
      shift: dto.shift,
    });
  }

  async findDeliveryLinks(
    purifierId: string,
    userId: string,
    userRoles: string[],
  ) {
    const purifier = await this.purifierModel.findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId && !userRoles.includes('admin')) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    return this.linkModel
      .find({ purifierId, ...softDeleteCondition(false) })
      .exec();
  }

  async updateDeliveryLink(
    purifierId: string,
    linkId: string,
    dto: UpdateDeliveryLinkDto,
    userId: string,
  ) {
    const purifier = await this.purifierModel.findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    const link = await this.linkModel
      .findOne({ _id: linkId, purifierId })
      .exec();
    if (!link) throw new NotFoundException('Vínculo no encontrado');
    Object.assign(link, dto);
    return link.save();
  }

  async removeDeliveryLink(purifierId: string, linkId: string, userId: string) {
    const purifier = await this.purifierModel.findById(purifierId).exec();
    if (!purifier) throw new NotFoundException('Purificadora no encontrada');
    if (String(purifier.ownerId) !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    const link = await this.linkModel
      .findOne({ _id: linkId, purifierId })
      .exec();
    if (!link) throw new NotFoundException('Vínculo no encontrado');
    (link as any).deletedAt = new Date();
    return link.save();
  }
}
