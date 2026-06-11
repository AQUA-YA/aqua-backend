import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PointsExpirationJob {
  private readonly logger = new Logger(PointsExpirationJob.name);

  constructor(
    @InjectModel('LoyaltyEntry') private readonly entryModel: Model<any>,
  ) {}

  @Cron('0 3 * * *')
  async expirePoints() {
    const now = new Date();
    const entries = await this.entryModel
      .find({
        type: { $in: ['earn', 'bonus'] },
        expiresAt: { $lt: now },
        remainingPoints: { $gt: 0 },
        deletedAt: null,
      })
      .exec();

    for (const entry of entries) {
      try {
        const remaining = entry.remainingPoints;

        await this.entryModel.create({
          userId: entry.userId,
          type: 'expire',
          points: remaining,
          remainingPoints: 0,
          description: `Expiración de puntos — lote ${entry._id}`,
        });

        entry.remainingPoints = 0;
        await entry.save();

        this.logger.log(
          `${remaining} puntos expirados de entrada ${entry._id}`,
        );
      } catch (err) {
        this.logger.error(
          `Error expirando puntos entrada ${entry._id}: ${err}`,
        );
      }
    }
  }
}
