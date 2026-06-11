import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationToken } from './schemas/notification-token.schema';
import { PUSH_PROVIDER } from '../../providers/providers.module';
import type { PushProvider } from '../../providers/providers.module';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationToken.name)
    private readonly tokenModel: Model<NotificationToken>,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {}

  async upsertToken(userId: string, token: string, platform: string) {
    return this.tokenModel
      .findOneAndUpdate(
        { token },
        { userId, platform, isActive: true },
        { upsert: true, new: true },
      )
      .exec();
  }

  async removeToken(token: string) {
    return this.tokenModel.findOneAndDelete({ token }).exec();
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const tokens = await this.tokenModel
      .find({ userId, isActive: true })
      .exec();
    if (tokens.length === 0) return;
    const tokenStrings = tokens.map((t) => t.token);
    await this.pushProvider.send(tokenStrings, title, body, data);
  }
}
