import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NotificationPreferenceEntity } from '../entities/notification.entity';
import { NotificationPreferenceModel } from './notification-preference.schema';

@Injectable()
export class NotificationPreferencesRepository {
  constructor(
    @InjectModel(NotificationPreferenceModel.name)
    private readonly notificationPreferenceModel: Model<NotificationPreferenceModel>,
  ) {}

  async upsert(preference: NotificationPreferenceEntity): Promise<void> {
    await this.notificationPreferenceModel
      .updateOne(
        {
          organizationId: preference.organizationId,
          teamId: preference.teamId ?? null,
        },
        {
          $set: {
            ...preference,
            teamId: preference.teamId ?? null,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async findByOrganizationAndTeam(
    organizationId: string,
    teamId?: string,
  ): Promise<NotificationPreferenceEntity | undefined> {
    const doc = await this.notificationPreferenceModel
      .findOne({ organizationId, teamId: teamId ?? null })
      .lean<NotificationPreferenceEntity>()
      .exec();

    return doc
      ? {
          ...doc,
          teamId: doc.teamId ?? undefined,
        }
      : undefined;
  }

  async listByOrganization(
    organizationId: string,
  ): Promise<NotificationPreferenceEntity[]> {
    const docs = await this.notificationPreferenceModel
      .find({ organizationId })
      .lean<NotificationPreferenceEntity[]>()
      .exec();

    return docs.map((doc) => ({
      ...doc,
      teamId: doc.teamId ?? undefined,
    }));
  }
}
