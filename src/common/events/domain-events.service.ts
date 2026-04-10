import { Injectable } from '@nestjs/common';
import { DomainEvent } from './domain-event.interface';

@Injectable()
export class DomainEventsService {
  private readonly events: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.events.push(event);
  }

  list(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
