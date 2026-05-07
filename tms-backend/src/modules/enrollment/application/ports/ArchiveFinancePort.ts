import type { StudentBalanceSnapshot } from '../dto/StudentDto.js';

export interface ArchiveFinancePort {
  settleForArchive(input: {
    teacherId: number;
    studentId: number;
    archivedAt: Date;
  }): Promise<StudentBalanceSnapshot>;
}
