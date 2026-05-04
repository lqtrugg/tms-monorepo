import { EntityManager } from 'typeorm';

import {
  Attendance,
  AttendanceSource,
  AttendanceStatus,
  Class,
  Enrollment,
  Session,
  Student,
} from '../../../entities/index.js';

export function findOwnedSession(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
): Promise<Session | null> {
  return manager.getRepository(Session).findOneBy({
    id: sessionId,
    teacher_id: teacherId,
  });
}

export function findOwnedClass(
  manager: EntityManager,
  teacherId: number,
  classId: number,
): Promise<Class | null> {
  return manager.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });
}

export function findOwnedStudent(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<Student | null> {
  return manager.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
}

export async function findEnrollmentAtSessionTime(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
  classId: number,
  scheduledAt: Date,
): Promise<Enrollment | null> {
  return manager
    .getRepository(Enrollment)
    .createQueryBuilder('enrollment')
    .where('enrollment.teacher_id = :teacherId', { teacherId })
    .andWhere('enrollment.student_id = :studentId', { studentId })
    .andWhere('enrollment.class_id = :classId', { classId })
    .andWhere('enrollment.enrolled_at <= :scheduledAt', { scheduledAt })
    .andWhere('(enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)', { scheduledAt })
    .orderBy('enrollment.enrolled_at', 'DESC')
    .getOne();
}

export async function findEnrollmentsAtSessionTime(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  scheduledAt: Date,
): Promise<Enrollment[]> {
  return manager
    .getRepository(Enrollment)
    .createQueryBuilder('enrollment')
    .where('enrollment.teacher_id = :teacherId', { teacherId })
    .andWhere('enrollment.class_id = :classId', { classId })
    .andWhere('enrollment.enrolled_at <= :scheduledAt', { scheduledAt })
    .andWhere('(enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)', { scheduledAt })
    .orderBy('enrollment.enrolled_at', 'DESC')
    .getMany();
}

export async function listStudentsEnrolledAtSessionTime(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  scheduledAt: Date,
): Promise<Student[]> {
  return manager
    .getRepository(Student)
    .createQueryBuilder('student')
    .innerJoin(
      Enrollment,
      'enrollment',
      `
        enrollment.teacher_id = student.teacher_id
        AND enrollment.student_id = student.id
        AND enrollment.class_id = :classId
        AND enrollment.enrolled_at <= :scheduledAt
        AND (enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)
      `,
      { classId, scheduledAt },
    )
    .where('student.teacher_id = :teacherId', { teacherId })
    .orderBy('student.full_name', 'ASC')
    .getMany();
}

export function findAttendanceBySession(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
): Promise<Attendance[]> {
  return manager.getRepository(Attendance).find({
    where: {
      teacher_id: teacherId,
      session_id: sessionId,
    },
  });
}

export function findAttendanceForStudent(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
  studentId: number,
): Promise<Attendance | null> {
  return manager.getRepository(Attendance).findOneBy({
    teacher_id: teacherId,
    session_id: sessionId,
    student_id: studentId,
  });
}

export function createAttendance(
  manager: EntityManager,
  input: {
    teacher_id: number;
    session_id: number;
    student_id: number;
    status: AttendanceStatus;
    source: AttendanceSource;
    overridden_at: Date | null;
    notes: string | null;
  },
): Attendance {
  return manager.getRepository(Attendance).create(input);
}

export function saveAttendance(manager: EntityManager, attendance: Attendance): Promise<Attendance> {
  return manager.getRepository(Attendance).save(attendance);
}

export function listAttendanceRecordsForTeacher(
  manager: EntityManager,
  teacherId: number,
  filters: {
    session_id?: number;
    student_id?: number;
    status?: AttendanceStatus;
  },
): Promise<Attendance[]> {
  return manager.getRepository(Attendance).find({
    where: {
      teacher_id: teacherId,
      ...(filters.session_id !== undefined ? { session_id: filters.session_id } : {}),
      ...(filters.student_id !== undefined ? { student_id: filters.student_id } : {}),
      ...(filters.status !== undefined ? { status: filters.status } : {}),
    },
    order: {
      id: 'DESC',
    },
  });
}

export function removeAttendanceRecords(
  manager: EntityManager,
  records: Attendance[],
): Promise<Attendance[]> {
  return manager.getRepository(Attendance).remove(records);
}
