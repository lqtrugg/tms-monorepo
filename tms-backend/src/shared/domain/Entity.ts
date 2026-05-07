export abstract class Entity<Id> {
  protected constructor(public readonly id: Id) {}

  equals(other: Entity<Id>): boolean {
    return this.id === other.id;
  }
}
