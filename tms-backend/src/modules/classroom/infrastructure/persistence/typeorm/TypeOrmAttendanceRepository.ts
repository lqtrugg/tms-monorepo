import type { EntityManager } from 'typeorm';

import { Enrollment } from '../../../../../entities/enrollment.entity.js';
import { Student } from '../../../../../entities/student.entity.js';
import type { AttendanceRepository } from './AttendanceRepository.js';
import { AttendanceOrmEntity } from './AttendanceOrmEntity.js';
import { ClassOrmEntity } from './ClassOrmEntity.js';
import { SessionOrmEntity } from './SessionOrmEntity.js';

export class TypeOrmAttendanceRepository implements AttendanceRepository {
  constructor(private readonly manager: EntityManager) {}

  findSessionById(teacherId: number, sessionId: number): Promise<SessionOrmEntity | null> {
    return this.manager.getRepository(SessionOrmEntity).findOneBy({
      id: sessionId,
      teacher_id: teacherId,
    });
  }

  findClassById(teacherId: number, classId: number): Promise<ClassOrmEntity | null> {
    return this.manager.getRepository(ClassOrmEntity).findOneBy({
      id: classId,
      teacher_id: teacherId,
    });
  }

  findStudentById(teacherId: number, studentId: number): Promise<Student | null> {
    return this.manager.getRepository(Student).findOneBy({
      id: studentId,
      teacher_id: teacherId,
    });
  }

  findEnrollmentAtSessionTime(
    teacherId: number,
    studentId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<Enrollment | null> {
    return this.manager
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

  findEnrollmentsAtSessionTime(
    teacherId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<Enrollment[]> {
    return this.manager
      .getRepository(Enrollment)
      .createQueryBuilder('enrollment')
      .where('enrollment.teacher_id = :teacherId', { teacherId })
      .andWhere('enrollment.class_id = :classId', { classId })
      .andWhere('enrollment.enrolled_at <= :scheduledAt', { scheduledAt })
      .andWhere('(enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)', { scheduledAt })
      .orderBy('enrollment.enrolled_at', 'DESC')
      .getMany();
  }

  findAttendanceForStudent(
    teacherId: number,
    sessionId: number,
    studentId: number,
  ): Promise<AttendanceOrmEntity | null> {
    return this.manager.getRepository(AttendanceOrmEntity).findOneBy({
      teacher_id: teacherId,
      session_id: sessionId,
      student_id: studentId,
    });
  }

  findAttendanceBySession(teacherId: number, sessionId: number): Promise<AttendanceOrmEntity[]> {
    return this.manager.getRepository(AttendanceOrmEntity).find({
      where: {
        teacher_id: teacherId,
        session_id: sessionId,
      },
    });
  }

  create(input: {
    teacher_id: number;
    session_id: number;
    student_id: number;
    status: AttendanceOrmEntity['status'];
    source: AttendanceOrmEntity['source'];
    overridden_at: Date | null;
    notes: string | null;
  }): AttendanceOrmEntity {
    return this.manager.getRepository(AttendanceOrmEntity).create(input);
  }

  save(attendance: AttendanceOrmEntity): Promise<AttendanceOrmEntity> {
    return this.manager.getRepository(AttendanceOrmEntity).save(attendance);
  }

  remove(records: AttendanceOrmEntity[]): Promise<AttendanceOrmEntity[]> {
    return this.manager.getRepository(AttendanceOrmEntity).remove(records);
  }
}
