import { In } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Class,
  ClassStatus,
  Enrollment,
  Student,
  StudentStatus,
  Topic,
  TopicProblem,
  TopicStanding,
  Transaction,
} from '../../entities/index.js';

export function countActiveStudents(teacherId: number): Promise<number> {
  return AppDataSource.getRepository(Student).countBy({
    teacher_id: teacherId,
    status: StudentStatus.Active,
  });
}

export function countActiveClasses(teacherId: number): Promise<number> {
  return AppDataSource.getRepository(Class).countBy({
    teacher_id: teacherId,
    status: ClassStatus.Active,
  });
}

export function findOwnedStudent(teacherId: number, studentId: number): Promise<Student | null> {
  return AppDataSource.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
}

export function findClassesByIds(teacherId: number, classIds: number[]): Promise<Class[]> {
  return classIds.length > 0
    ? AppDataSource.getRepository(Class).findBy({ teacher_id: teacherId, id: In(classIds) })
    : Promise.resolve([]);
}

export function findReportClasses(teacherId: number, classIds?: number[]): Promise<Class[]> {
  return AppDataSource.getRepository(Class).find({
    where: {
      teacher_id: teacherId,
      ...(classIds && classIds.length > 0 ? { id: In(classIds) } : {}),
    },
  });
}

export async function getRevenueTotalsBetween(
  teacherId: number,
  from: Date,
  to: Date,
): Promise<{ payments: string; refunds: string } | undefined> {
  return AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .select("COALESCE(SUM(CASE WHEN transaction.type = 'payment' THEN transaction.amount ELSE 0 END), 0)", 'payments')
    .addSelect("COALESCE(SUM(CASE WHEN transaction.type = 'refund' THEN ABS(transaction.amount) ELSE 0 END), 0)", 'refunds')
    .where('transaction.teacher_id = :teacherId', { teacherId })
    .andWhere('transaction.recorded_at >= :from', { from })
    .andWhere('transaction.recorded_at <= :to', { to })
    .getRawOne<{ payments: string; refunds: string }>();
}

export function findTopicsByIds(teacherId: number, topicIds: number[]): Promise<Topic[]> {
  return AppDataSource.getRepository(Topic).findBy({ teacher_id: teacherId, id: In(topicIds) });
}

export function findTopicProblemsByIds(teacherId: number, problemIds: number[]): Promise<TopicProblem[]> {
  return AppDataSource.getRepository(TopicProblem).findBy({ teacher_id: teacherId, id: In(problemIds) });
}

export function findStudentTopicStandings(teacherId: number, studentId: number): Promise<TopicStanding[]> {
  return AppDataSource.getRepository(TopicStanding).find({
    where: {
      teacher_id: teacherId,
      student_id: studentId,
    },
    order: {
      pulled_at: 'DESC',
    },
  });
}

export function findStudentTransactions(teacherId: number, studentId: number): Promise<Transaction[]> {
  return AppDataSource.getRepository(Transaction).find({
    where: {
      teacher_id: teacherId,
      student_id: studentId,
    },
    order: {
      recorded_at: 'DESC',
    },
  });
}

export async function countActiveEnrollmentsByClass(
  teacherId: number,
  classIds: number[],
): Promise<Map<number, number>> {
  const rows = await AppDataSource.getRepository(Enrollment)
    .createQueryBuilder('enrollment')
    .select('enrollment.class_id', 'class_id')
    .addSelect('COUNT(*)', 'student_count')
    .where('enrollment.teacher_id = :teacherId', { teacherId })
    .andWhere('enrollment.unenrolled_at IS NULL')
    .andWhere(classIds.length > 0 ? 'enrollment.class_id IN (:...classIds)' : '1=1', { classIds })
    .groupBy('enrollment.class_id')
    .getRawMany<{ class_id: string; student_count: string }>();

  return new Map(rows.map((row) => [Number(row.class_id), Number(row.student_count)]));
}
