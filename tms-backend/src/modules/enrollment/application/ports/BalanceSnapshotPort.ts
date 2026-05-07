import type { StudentBalanceSnapshot } from '../dto/StudentDto.js';

export interface BalanceSnapshotPort {
  loadForStudent(teacherId: number, studentId: number): Promise<StudentBalanceSnapshot>;
}
