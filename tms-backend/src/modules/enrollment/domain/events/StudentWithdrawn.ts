import type { DomainEvent } from '../../../../shared/domain/DomainEvent.js';
import type { EnrollmentPendingArchiveReason, EnrollmentStudentStatus } from '../models/Student.js';

export class StudentWithdrawn implements DomainEvent {
  readonly name = 'StudentWithdrawn';

  constructor(
    public readonly teacherId: number,
    public readonly studentId: number,
    public readonly status: EnrollmentStudentStatus,
    public readonly pendingArchiveReason: EnrollmentPendingArchiveReason | null,
    public readonly occurredAt: Date,
  ) {}
}
