import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessControlModule } from '../common/auth/access-control.module';
import { RequestsModule } from '../requests/requests.module';
import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { MongoPlaygroundAssetsRepository } from './repositories/mongo-playground-assets.repository';
import { MongoPlaygroundHypothesesRepository } from './repositories/mongo-playground-hypotheses.repository';
import { MongoPlaygroundInsightsRepository } from './repositories/mongo-playground-insights.repository';
import { MongoPlaygroundWorkspacesRepository } from './repositories/mongo-playground-workspaces.repository';
import {
  PLAYGROUND_ASSETS_REPOSITORY,
} from './repositories/playground-assets-repository.interface';
import {
  PLAYGROUND_HYPOTHESES_REPOSITORY,
} from './repositories/playground-hypotheses-repository.interface';
import {
  PlaygroundHypothesisModel,
  PlaygroundHypothesisSchema,
} from './repositories/playground-hypothesis.schema';
import {
  PLAYGROUND_INSIGHTS_REPOSITORY,
} from './repositories/playground-insights-repository.interface';
import {
  PlaygroundInsightModel,
  PlaygroundInsightSchema,
} from './repositories/playground-insight.schema';
import {
  PlaygroundAssetModel,
  PlaygroundAssetSchema,
} from './repositories/playground-asset.schema';
import {
  PLAYGROUND_WORKSPACES_REPOSITORY,
} from './repositories/playground-workspaces-repository.interface';
import {
  PlaygroundWorkspaceModel,
  PlaygroundWorkspaceSchema,
} from './repositories/playground-workspace.schema';
import { PlaygroundStorageService } from './storage/playground-storage.service';

@Module({
  imports: [
    AccessControlModule,
    RequestsModule,
    MongooseModule.forFeature([
      {
        name: PlaygroundWorkspaceModel.name,
        schema: PlaygroundWorkspaceSchema,
      },
      {
        name: PlaygroundAssetModel.name,
        schema: PlaygroundAssetSchema,
      },
      {
        name: PlaygroundHypothesisModel.name,
        schema: PlaygroundHypothesisSchema,
      },
      {
        name: PlaygroundInsightModel.name,
        schema: PlaygroundInsightSchema,
      },
    ]),
  ],
  controllers: [PlaygroundController],
  providers: [
    PlaygroundService,
    PlaygroundStorageService,
    MongoPlaygroundWorkspacesRepository,
    MongoPlaygroundAssetsRepository,
    MongoPlaygroundHypothesesRepository,
    MongoPlaygroundInsightsRepository,
    {
      provide: PLAYGROUND_WORKSPACES_REPOSITORY,
      useExisting: MongoPlaygroundWorkspacesRepository,
    },
    {
      provide: PLAYGROUND_ASSETS_REPOSITORY,
      useExisting: MongoPlaygroundAssetsRepository,
    },
    {
      provide: PLAYGROUND_HYPOTHESES_REPOSITORY,
      useExisting: MongoPlaygroundHypothesesRepository,
    },
    {
      provide: PLAYGROUND_INSIGHTS_REPOSITORY,
      useExisting: MongoPlaygroundInsightsRepository,
    },
  ],
  exports: [PlaygroundService],
})
export class PlaygroundModule {}
