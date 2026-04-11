import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ReleaseEntity } from '../entities/release.entity';
import { ReleaseModel } from './release.schema';

@Injectable()
export class ReleasesRepository {
  constructor(
    @InjectModel(ReleaseModel.name)
    private readonly releaseModel: Model<ReleaseModel>,
  ) {}

  async insert(release: ReleaseEntity): Promise<void> {
    await this.releaseModel.create(release);
  }

  async listByOrganization(organizationId: string): Promise<ReleaseEntity[]> {
    return this.releaseModel
      .find({ organizationId })
      .sort({ createdAt: -1 })
      .lean<ReleaseEntity[]>()
      .exec();
  }
}
