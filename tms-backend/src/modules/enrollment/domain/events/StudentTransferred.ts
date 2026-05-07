import type { DomainEvent } from '../../../../shared/domain/DomainEvent.js';

export class StudentTransferred implements DomainEvent {
  readonly name = 'StudentTransferred';

  constructor(
    public readonly teacherId: number,
    public readonly studentId: number,
    public readonly toClassId: number,
    public readonly occurredAt: Date,
  ) {}
}
