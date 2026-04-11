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
}
