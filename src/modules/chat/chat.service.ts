import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { ChatMessage } from './schemas/chat-message.schema';
import { CreateChatMessageDto } from './dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';
import { softDeleteCondition } from '../../common/helpers/soft-delete.helper';
import { CHAT_VISIBILITY_HOURS } from '../../common/constants/business.constants';
import { ChatMessageType } from '../../common/interfaces/enums';

const ACTIVE_STATUSES = ['pending', 'accepted', 'in_transit', 'empty_pickup'];

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessage>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findAll(
    orderId: string,
    userId: string,
    roles: string[],
    query: PaginationDto,
  ): Promise<PaginatedResult<ChatMessage>> {
    const order = await this.getOrderModel().findById(orderId).exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const isParticipant = this.isParticipant(order, userId);
    const isAdmin = roles.includes('admin');
    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para ver estos mensajes');
    }

    const isActive = ACTIVE_STATUSES.includes(order.status);
    if (!isActive) {
      const hoursSinceUpdate =
        (Date.now() - new Date(order.updatedAt || order.createdAt).getTime()) /
        3600000;
      if (hoursSinceUpdate >= CHAT_VISIBILITY_HOURS) {
        throw new NotFoundException('El chat ya no está disponible');
      }
    }

    const { page = 1, limit = 20 } = query;
    const safeLimit = Math.min(limit, 100);
    const filter = { orderId, ...softDeleteCondition(false) };

    const [data, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip((page - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
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

  async create(
    orderId: string,
    dto: CreateChatMessageDto,
    userId: string,
    roles: string[],
  ): Promise<ChatMessage> {
    const order = await this.getOrderModel().findById(orderId).exec();
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const isParticipant = this.isParticipant(order, userId);
    const isAdmin = roles.includes('admin');
    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('No tienes permiso para enviar mensajes');
    }

    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new BadRequestException('El chat está cerrado');
    }

    const user = await this.getUserModel().findById(userId).exec();
    const isDelivery = user?.roles?.includes('delivery');
    const isPurifier = user?.roles?.includes('purifier');
    const isConsumer = user?.roles?.includes('consumer');

    let senderRole: string;
    if (isConsumer) senderRole = 'consumer';
    else if (isDelivery) senderRole = 'delivery';
    else if (isPurifier) senderRole = 'delivery';
    else senderRole = 'consumer';

    if (isConsumer && dto.messageType === ChatMessageType.PHOTO) {
      throw new BadRequestException('No puedes enviar fotos');
    }

    return this.messageModel.create({
      orderId,
      senderId: userId,
      senderRole,
      messageType: dto.messageType || ChatMessageType.TEXT,
      content: dto.content,
    });
  }

  private isParticipant(order: any, userId: string): boolean {
    return (
      String(order.consumerId) === userId ||
      String(order.acceptedById) === userId ||
      String(order.assignedDeliveryUserId) === userId
    );
  }

  private getOrderModel(): Model<any> {
    return this.connection.model('Order');
  }

  private getUserModel(): Model<any> {
    return this.connection.model('User');
  }
}
