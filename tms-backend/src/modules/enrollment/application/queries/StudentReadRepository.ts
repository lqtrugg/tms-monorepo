import type { StudentListFilters, StudentSummary } from '../dto/StudentDto.js';

export interface StudentReadRepository {
  listStudents(teacherId: number, filters: StudentListFilters): Promise<StudentSummary[]>;
  getStudentById(teacherId: number, studentId: number): Promise<StudentSummary>;
}
