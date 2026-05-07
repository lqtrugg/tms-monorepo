import type { DomainEvent } from '../../../../shared/domain/DomainEvent.js';

export class StudentReinstated implements DomainEvent {
  readonly name = 'StudentReinstated';

  constructor(
    public readonly teacherId: number,
    public readonly studentId: number,
    public readonly classId: number,
    public readonly occurredAt: Date,
  ) {}
}
