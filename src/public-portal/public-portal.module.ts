import { Module } from '@nestjs/common';
import { FeedbackModule } from '../feedback/feedback.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { RequestsModule } from '../requests/requests.module';
import { PublicPortalController } from './public-portal.controller';
import { PublicPortalService } from './public-portal.service';

@Module({
  imports: [
    OrganizationsModule,
    FeedbackModule,
    RequestsModule,
    RoadmapModule,
    NotificationsModule,
  ],
  controllers: [PublicPortalController],
  providers: [PublicPortalService],
})
export class PublicPortalModule {}
