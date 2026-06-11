import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommissionConfig } from './schemas/commission-config.schema';
import { CreateCommissionConfigDto } from './dto/commission-config.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { CommissionType } from '../../common/interfaces/enums';

@Injectable()
export class CommissionConfigService {
  constructor(
    @InjectModel(CommissionConfig.name)
    private readonly model: Model<CommissionConfig>,
  ) {}

  async getCurrent() {
    const latest = await this.model.findOne().sort({ createdAt: -1 }).exec();
    if (!latest) return { type: CommissionType.DISABLED, value: 0 };
    return latest;
  }

  async create(dto: CreateCommissionConfigDto, updatedBy: string) {
    if (dto.type === CommissionType.PERCENTAGE && dto.value > 100) {
      throw new BadRequestException('El porcentaje no puede superar 100');
    }
    if (dto.type === CommissionType.PERCENTAGE && dto.value < 0) {
      throw new BadRequestException('El porcentaje no puede ser negativo');
    }
    return this.model.create({ ...dto, updatedBy });
  }

  async findHistory(
    query: PaginationDto,
  ): Promise<PaginatedResult<CommissionConfig>> {
    const { page = 1, limit = 20, includeDeleted = 'false' } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = softDeleteCondition(includeDeleted === 'true');
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
}
