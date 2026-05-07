import type { AttendanceRecordSummary } from '../../../application/dto/AttendanceDto.js';
import type { AttendanceOrmEntity } from './AttendanceOrmEntity.js';

export class AttendanceMapper {
  static toSummary(attendance: AttendanceOrmEntity): AttendanceRecordSummary {
    return {
      id: attendance.id,
      teacher_id: attendance.teacher_id,
      session_id: attendance.session_id,
      student_id: attendance.student_id,
      status: attendance.status,
      source: attendance.source,
      overridden_at: attendance.overridden_at,
      notes: attendance.notes,
    };
  }
}
