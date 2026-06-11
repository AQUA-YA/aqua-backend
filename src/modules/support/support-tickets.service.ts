import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportTicket } from './schemas/support-ticket.schema';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  SupportTicketQueryDto,
} from './dto';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { Role } from '../../common/interfaces/enums';

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectModel(SupportTicket.name)
    private readonly ticketModel: Model<SupportTicket>,
  ) {}

  async create(
    dto: CreateSupportTicketDto,
    userId: string,
  ): Promise<SupportTicket> {
    return this.ticketModel.create({
      ...dto,
      userId,
      status: 'open',
    });
  }

  async findMine(
    userId: string,
    query: SupportTicketQueryDto,
  ): Promise<PaginatedResult<SupportTicket>> {
    const { page = 1, limit = 20, status } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { userId, ...softDeleteCondition(false) };
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.ticketModel.countDocuments(filter).exec(),
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

  async findAll(
    query: SupportTicketQueryDto,
  ): Promise<PaginatedResult<SupportTicket>> {
    const { page = 1, limit = 20, status, search } = query;
    const safeLimit = Math.min(limit, 100);
    const filter: any = { ...softDeleteCondition(false) };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [{ subject: { $regex: search, $options: 'i' } }];
    }
    const [data, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.ticketModel.countDocuments(filter).exec(),
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

  async findOne(
    id: string,
    userId: string,
    roles: string[],
  ): Promise<SupportTicket> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) throw new NotFoundException('Recurso no encontrado');
    const isOwner = String(ticket.userId) === userId;
    const isAdmin = roles.includes(Role.ADMIN);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    return ticket;
  }

  async update(
    id: string,
    dto: UpdateSupportTicketDto,
    userId: string,
  ): Promise<SupportTicket> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) throw new NotFoundException('Recurso no encontrado');

    Object.assign(ticket, dto);

    if (dto.status === 'closed') {
      ticket.closedAt = new Date();
      ticket.resolvedBy = userId;
    }

    if (dto.adminResponse) {
      ticket.adminResponse = dto.adminResponse;
      ticket.resolvedBy = userId;
    }

    return ticket.save();
  }
}
