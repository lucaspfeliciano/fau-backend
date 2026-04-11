import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NotificationEntity } from '../entities/notification.entity';
import { NotificationModel } from './notification.schema';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(NotificationModel.name)
    private readonly notificationModel: Model<NotificationModel>,
  ) {}

  async insert(notification: NotificationEntity): Promise<void> {
    await this.notificationModel.create(notification);
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<NotificationEntity[]> {
    return this.notificationModel
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .lean<NotificationEntity[]>()
      .exec();
  }
}
