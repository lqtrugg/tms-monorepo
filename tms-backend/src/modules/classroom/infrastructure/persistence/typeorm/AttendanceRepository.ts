import type { Enrollment } from '../../../../../entities/enrollment.entity.js';
import type { Student } from '../../../../../entities/student.entity.js';
import type { AttendanceOrmEntity } from './AttendanceOrmEntity.js';
import type { ClassOrmEntity } from './ClassOrmEntity.js';
import type { SessionOrmEntity } from './SessionOrmEntity.js';

export interface AttendanceRepository {
  findSessionById(teacherId: number, sessionId: number): Promise<SessionOrmEntity | null>;
  findClassById(teacherId: number, classId: number): Promise<ClassOrmEntity | null>;
  findStudentById(teacherId: number, studentId: number): Promise<Student | null>;
  findEnrollmentAtSessionTime(
    teacherId: number,
    studentId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<Enrollment | null>;
  findEnrollmentsAtSessionTime(
    teacherId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<Enrollment[]>;
  findAttendanceForStudent(
    teacherId: number,
    sessionId: number,
    studentId: number,
  ): Promise<AttendanceOrmEntity | null>;
  findAttendanceBySession(teacherId: number, sessionId: number): Promise<AttendanceOrmEntity[]>;
  create(input: {
    teacher_id: number;
    session_id: number;
    student_id: number;
    status: AttendanceOrmEntity['status'];
    source: AttendanceOrmEntity['source'];
    overridden_at: Date | null;
    notes: string | null;
  }): AttendanceOrmEntity;
  save(attendance: AttendanceOrmEntity): Promise<AttendanceOrmEntity>;
  remove(records: AttendanceOrmEntity[]): Promise<AttendanceOrmEntity[]>;
}
