import type { Student } from '../../../domain/models/Student.js';
import type { StudentId } from '../../../domain/value-objects/StudentId.js';

export interface StudentRepository {
  codeforcesHandleExists(teacherId: number, codeforcesHandle: string, excludeStudentId?: number): Promise<boolean>;
  requireById(id: StudentId): Promise<Student>;
  save(student: Student): Promise<Student>;
}
