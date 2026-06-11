import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WaterType } from './schemas/water-type.schema';
import { CreateWaterTypeDto, UpdateWaterTypeDto } from './dto/water-type.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';

@Injectable()
export class WaterTypesService {
  constructor(
    @InjectModel(WaterType.name) private readonly model: Model<WaterType>,
  ) {}

  async create(dto: CreateWaterTypeDto) {
    return this.model.create(dto);
  }

  async findAll(
    query: PaginationDto,
    isAdmin = false,
  ): Promise<PaginatedResult<WaterType>> {
    const { search, page = 1, limit = 20, includeDeleted = 'false' } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = softDeleteCondition(includeDeleted === 'true');
    if (!isAdmin) filter.isActive = true;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments(filter).exec(),
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

  async findOne(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Tipo de agua no encontrado');
    return doc;
  }

  async update(id: string, dto: UpdateWaterTypeDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Tipo de agua no encontrado');
    Object.assign(doc, dto);
    return doc.save();
  }

  async remove(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Tipo de agua no encontrado');
    (doc as any).deletedAt = new Date();
    return doc.save();
  }
}
