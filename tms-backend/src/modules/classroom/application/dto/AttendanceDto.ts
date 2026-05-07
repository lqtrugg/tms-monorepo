import type {
  AttendanceSource,
  AttendanceStatus,
  StudentStatus,
} from '../../../../entities/enums.js';
import type { SessionSummary } from './ClassDto.js';

export type AttendanceListFilters = {
  session_id?: number;
  student_id?: number;
  status?: AttendanceStatus;
};

export type SessionAttendanceRow = {
  student_id: number;
  student_name: string;
  student_status: StudentStatus;
  attendance_id: number | null;
  attendance_status: AttendanceStatus | null;
  source: AttendanceSource | null;
  notes: string | null;
  overridden_at: Date | null;
};

export type SessionAttendanceSummary = {
  session: SessionSummary;
  attendance: SessionAttendanceRow[];
};

export type AttendanceRecordSummary = {
  id: number;
  teacher_id: number;
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  source: AttendanceSource;
  overridden_at: Date | null;
  notes: string | null;
};

export type UpsertSessionAttendanceInput = {
  status: AttendanceStatus;
  notes?: string | null;
};
