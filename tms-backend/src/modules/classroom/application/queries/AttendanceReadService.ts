import type {
  AttendanceListFilters,
  AttendanceRecordSummary,
  SessionAttendanceSummary,
} from '../dto/AttendanceDto.js';
import type { AttendanceReadRepository } from './AttendanceReadRepository.js';

export class AttendanceReadService {
  constructor(private readonly attendance: AttendanceReadRepository) {}

  getSessionAttendance(teacherId: number, sessionId: number): Promise<SessionAttendanceSummary> {
    return this.attendance.getSessionAttendance(teacherId, sessionId);
  }

  listAttendanceRecords(
    teacherId: number,
    filters: AttendanceListFilters,
  ): Promise<AttendanceRecordSummary[]> {
    return this.attendance.listAttendanceRecords(teacherId, filters);
  }
}
