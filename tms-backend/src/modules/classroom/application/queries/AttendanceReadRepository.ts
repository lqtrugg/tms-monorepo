import type {
  AttendanceListFilters,
  AttendanceRecordSummary,
  SessionAttendanceSummary,
} from '../dto/AttendanceDto.js';

export interface AttendanceReadRepository {
  getSessionAttendance(teacherId: number, sessionId: number): Promise<SessionAttendanceSummary>;
  listAttendanceRecords(teacherId: number, filters: AttendanceListFilters): Promise<AttendanceRecordSummary[]>;
}
