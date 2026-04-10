import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainEventsService } from '../common/events/domain-events.service';
import { TeamEntity } from './entities/team.entity';

@Injectable()
export class TeamsService {
  private readonly teams: TeamEntity[] = [];

  constructor(private readonly domainEventsService: DomainEventsService) {}

  create(name: string, organizationId: string, actorId: string): TeamEntity {
    const now = new Date().toISOString();

    const team: TeamEntity = {
      id: randomUUID(),
      name: name.trim(),
      organizationId,
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.push(team);

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

  listByOrganization(organizationId: string): TeamEntity[] {
    return this.teams.filter((team) => team.organizationId === organizationId);
  }
}
