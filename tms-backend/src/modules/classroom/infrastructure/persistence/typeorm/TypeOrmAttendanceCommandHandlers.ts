import type { AttendanceRecordSummary, UpsertSessionAttendanceInput } from '../../../application/dto/AttendanceDto.js';
import { AppDataSource } from '../../../../../data-source.js';
import { ResetSessionAttendanceUseCase } from '../../../application/commands/ResetSessionAttendanceUseCase.js';
import { UpsertSessionAttendanceUseCase } from '../../../application/commands/UpsertSessionAttendanceUseCase.js';
import { syncVoiceAttendanceForSession } from '../../../jobs/voice-attendance-sync.job.js';
import { TypeOrmAttendanceRepository } from './TypeOrmAttendanceRepository.js';
import { TypeOrmSessionFinancePort } from './TypeOrmSessionFinancePort.js';

export class TypeOrmAttendanceCommandHandlers {
  async upsertSessionAttendance(input: {
    teacherId: number;
    sessionId: number;
    studentId: number;
    attendance: UpsertSessionAttendanceInput;
  }): Promise<AttendanceRecordSummary | null> {
    return AppDataSource.transaction(async (manager) => {
      const attendanceRepository = new TypeOrmAttendanceRepository(manager);
      const finance = new TypeOrmSessionFinancePort(manager);
      const useCase = new UpsertSessionAttendanceUseCase(attendanceRepository, finance);
      return useCase.execute(input);
    });
  }

  async resetSessionAttendance(input: {
    teacherId: number;
    sessionId: number;
  }): Promise<void> {
    return AppDataSource.transaction(async (manager) => {
      const attendanceRepository = new TypeOrmAttendanceRepository(manager);
      const finance = new TypeOrmSessionFinancePort(manager);
      const useCase = new ResetSessionAttendanceUseCase(attendanceRepository, finance);
      return useCase.execute(input);
    });
  }

  syncSessionAttendance(input: {
    teacherId: number;
    sessionId: number;
  }) {
    return syncVoiceAttendanceForSession(input.teacherId, input.sessionId);
  }
}
