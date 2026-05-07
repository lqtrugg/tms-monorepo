import { ClassStatus } from '../../../../entities/enums.js';
import { ClassServiceError } from '../../../../shared/errors/class.error.js';

type CreateClassProps = {
  teacherId: number;
  name: string;
  feePerSession: string;
};

type ClassSnapshot = {
  id: number | null;
  teacherId: number;
  name: string;
  feePerSession: string;
  status: ClassStatus;
  createdAt: Date | null;
  archivedAt: Date | null;
};

function normalizeClassName(name: string): string {
  const normalized = name.trim();

  if (!normalized) {
    throw new ClassServiceError('class name is required', 400);
  }

  return normalized;
}

function normalizeFeePerSession(feePerSession: string): string {
  const normalized = feePerSession.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new ClassServiceError('fee_per_session must be a non-negative integer string', 400);
  }

  return normalized;
}

export class ClassroomClass {
  private constructor(private readonly snapshot: ClassSnapshot) {}

  static create(props: CreateClassProps): ClassroomClass {
    return new ClassroomClass({
      id: null,
      teacherId: props.teacherId,
      name: normalizeClassName(props.name),
      feePerSession: normalizeFeePerSession(props.feePerSession),
      status: ClassStatus.Active,
      createdAt: null,
      archivedAt: null,
    });
  }

  static restore(snapshot: ClassSnapshot): ClassroomClass {
    return new ClassroomClass(snapshot);
  }

  rename(name: string): void {
    this.snapshot.name = normalizeClassName(name);
  }

  updateFeePerSession(feePerSession: string): void {
    this.snapshot.feePerSession = normalizeFeePerSession(feePerSession);
  }

  archive(archivedAt: Date): void {
    if (this.snapshot.status === ClassStatus.Archived) {
      return;
    }

    this.snapshot.status = ClassStatus.Archived;
    this.snapshot.archivedAt = archivedAt;
  }

  toSnapshot(): ClassSnapshot {
    return { ...this.snapshot };
  }
}
