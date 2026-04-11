import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainEventsService } from '../common/events/domain-events.service';
import { TeamEntity } from './entities/team.entity';
import { TeamsRepository } from './repositories/teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(
    name: string,
    organizationId: string,
    actorId: string,
  ): Promise<TeamEntity> {
    const now = new Date().toISOString();

    const team: TeamEntity = {
      id: randomUUID(),
      name: name.trim(),
      organizationId,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    };

    await this.teamsRepository.insert(team);

    this.domainEventsService.publish({
      name: 'team.created',
      occurredAt: now,
      actorId,
      organizationId,
      payload: {
        teamId: team.id,
        name: team.name,
      },
    });

    return team;
  }

  listByOrganization(organizationId: string): Promise<TeamEntity[]> {
    return this.teamsRepository.listByOrganization(organizationId);
  }
}
