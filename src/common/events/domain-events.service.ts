import { Injectable } from '@nestjs/common';
import { DomainEvent } from './domain-event.interface';

@Injectable()
export class DomainEventsService {
  private readonly events: DomainEvent[] = [];
  private readonly subscribers: Array<(event: DomainEvent) => void> = [];

  publish(event: DomainEvent): void {
    this.events.push(event);

    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  list(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  subscribe(handler: (event: DomainEvent) => void): () => void {
    this.subscribers.push(handler);

    return () => {
      const index = this.subscribers.indexOf(handler);
      if (index >= 0) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}
