import { Entity } from './Entity.js';
import type { DomainEvent } from './DomainEvent.js';

export abstract class AggregateRoot<Id> extends Entity<Id> {
  private readonly domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    return this.domainEvents.splice(0);
  }
}
