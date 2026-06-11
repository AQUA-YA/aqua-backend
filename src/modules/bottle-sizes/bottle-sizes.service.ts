import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BottleSize } from './schemas/bottle-size.schema';
import {
  CreateBottleSizeDto,
  UpdateBottleSizeDto,
} from './dto/bottle-size.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';

@Injectable()
export class BottleSizesService {
  constructor(
    @InjectModel(BottleSize.name) private readonly model: Model<BottleSize>,
  ) {}

  async create(dto: CreateBottleSizeDto) {
    return this.model.create(dto);
  }

  async findAll(
    query: PaginationDto,
    isAdmin = false,
  ): Promise<PaginatedResult<BottleSize>> {
    const { search, page = 1, limit = 20, includeDeleted = 'false' } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = softDeleteCondition(includeDeleted === 'true');
    if (!isAdmin) filter.isActive = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { liters: { $regex: search, $options: 'i' } },
      ];
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
    if (!doc) throw new NotFoundException('Tamaño de garrafón no encontrado');
    return doc;
  }

  async update(id: string, dto: UpdateBottleSizeDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Tamaño de garrafón no encontrado');
    Object.assign(doc, dto);
    return doc.save();
  }

  async remove(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Tamaño de garrafón no encontrado');
    (doc as any).deletedAt = new Date();
    return doc.save();
  }
}
