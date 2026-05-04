import { In } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import { Class, Enrollment } from '../../../entities/index.js';

export function findReportClasses(teacherId: number, classIds?: number[]): Promise<Class[]> {
  return AppDataSource.getRepository(Class).find({
    where: {
      teacher_id: teacherId,
      ...(classIds && classIds.length > 0 ? { id: In(classIds) } : {}),
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
