import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { BoardEntity } from '../entities/board.entity';
import { BoardModel } from './board.schema';

@Injectable()
export class BoardsRepository {
  constructor(
    @InjectModel(BoardModel.name)
    private readonly boardModel: Model<BoardModel>,
  ) {}

  async insert(board: BoardEntity): Promise<void> {
    await this.boardModel.create(board);
  }

  async update(board: BoardEntity): Promise<void> {
    await this.boardModel
      .updateOne(
        {
          id: board.id,
          organizationId: board.organizationId,
        },
        {
          $set: board,
        },
      )
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<BoardEntity | undefined> {
    const doc = await this.boardModel
      .findOne({ id, organizationId })
      .select({ _id: 0 })
      .lean<BoardEntity>()
      .exec();

    return doc ?? undefined;
  }

  async findByName(
    name: string,
    organizationId: string,
  ): Promise<BoardEntity | undefined> {
    const doc = await this.boardModel
      .findOne({ name, organizationId })
      .select({ _id: 0 })
      .lean<BoardEntity>()
      .exec();

    return doc ?? undefined;
  }

  async listByOrganization(organizationId: string): Promise<BoardEntity[]> {
    return this.boardModel
      .find({ organizationId })
      .sort({ updatedAt: -1 })
      .select({ _id: 0 })
      .lean<BoardEntity[]>()
      .exec();
  }
}
