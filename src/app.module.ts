import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AccessControlModule } from './common/auth/access-control.module';
import { DomainEventsModule } from './common/events/domain-events.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RequestsModule } from './requests/requests.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DomainEventsModule,
    UsersModule,
    AccessControlModule,
    OrganizationsModule,
    RequestsModule,
    TeamsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
