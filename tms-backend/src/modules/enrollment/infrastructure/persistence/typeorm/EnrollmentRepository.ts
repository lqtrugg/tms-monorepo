import type { Enrollment } from '../../../domain/models/Enrollment.js';
import type { StudentId } from '../../../domain/value-objects/StudentId.js';

export interface EnrollmentRepository {
  findActiveByStudent(teacherId: number, studentId: StudentId): Promise<Enrollment | null>;
  save(enrollment: Enrollment): Promise<Enrollment>;
}
