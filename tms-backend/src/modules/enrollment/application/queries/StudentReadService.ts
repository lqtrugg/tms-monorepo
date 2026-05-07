import type { StudentListFilters, StudentSummary } from '../dto/StudentDto.js';
import type { StudentReadRepository } from './StudentReadRepository.js';

export class StudentReadService {
  constructor(private readonly students: StudentReadRepository) {}

  listStudents(teacherId: number, filters: StudentListFilters): Promise<StudentSummary[]> {
    return this.students.listStudents(teacherId, filters);
  }

  getStudentById(teacherId: number, studentId: number): Promise<StudentSummary> {
    return this.students.getStudentById(teacherId, studentId);
  }
}
