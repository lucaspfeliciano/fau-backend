import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UserEntity } from '../entities/user.entity';
import { UserModel } from './user.schema';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserModel>,
  ) {}

  async findById(id: string): Promise<UserEntity | undefined> {
    const doc = await this.userModel
      .findOne({ id })
      .select({ _id: 0 })
      .lean<UserEntity>()
      .exec();
    return doc ?? undefined;
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    const doc = await this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select({ _id: 0 })
      .lean<UserEntity>()
      .exec();
    return doc ?? undefined;
  }

  async findByEmailOrGoogleId(
    email: string,
    googleId?: string,
  ): Promise<UserEntity | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const filter = googleId
      ? { $or: [{ email: normalizedEmail }, { googleId }] }
      : { email: normalizedEmail };

    const doc = await this.userModel
      .findOne(filter)
      .select({ _id: 0 })
      .lean<UserEntity>()
      .exec();

    return doc ?? undefined;
  }

  async insert(user: UserEntity): Promise<void> {
    await this.userModel.create(user);
  }

  async update(user: UserEntity): Promise<void> {
    const { _id, __v, ...safeUser } = user as UserEntity & {
      _id?: unknown;
      __v?: unknown;
    };

    await this.userModel
      .updateOne(
        {
          id: user.id,
        },
        {
          $set: safeUser,
        },
      )
      .exec();
  }

  async listByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      role?: string;
    },
  ): Promise<{ items: UserEntity[]; total: number }> {
    const filter: Record<string, unknown> = {
      'memberships.organizationId': organizationId,
    };

    if (options.search) {
      const regex = { $regex: options.search, $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (options.role) {
      filter.memberships = {
        $elemMatch: {
          organizationId,
          role: options.role,
        },
      };
    }

    const total = await this.userModel.countDocuments(filter).exec();

    const docs = await this.userModel
      .find(filter)
      .select({ _id: 0, passwordHash: 0 })
      .sort({ createdAt: -1 })
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean<UserEntity[]>()
      .exec();

    return { items: docs, total };
  }

  async countAdminsInOrganization(organizationId: string): Promise<number> {
    return this.userModel
      .countDocuments({
        memberships: {
          $elemMatch: {
            organizationId,
            role: 'Admin',
          },
        },
      })
      .exec();
  }
}
