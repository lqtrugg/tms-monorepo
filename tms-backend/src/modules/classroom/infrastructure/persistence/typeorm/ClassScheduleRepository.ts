import type { ClassScheduleOrmEntity } from './ClassScheduleOrmEntity.js';
import type { ClassOrmEntity } from './ClassOrmEntity.js';

export interface ClassScheduleRepository {
  findClassById(teacherId: number, classId: number): Promise<ClassOrmEntity | null>;
  findByIdForClass(
    teacherId: number,
    classId: number,
    scheduleId: number,
  ): Promise<ClassScheduleOrmEntity | null>;
  hasOverlappingPersistedSchedule(
    teacherId: number,
    schedule: {
      day_of_week: number;
      start_time: string;
      end_time: string;
    },
    options?: {
      excludeClassId?: number;
      excludeScheduleId?: number;
    },
  ): Promise<boolean>;
  hasOverlappingUpcomingSessions(
    teacherId: number,
    classId: number,
    schedules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
    }>,
  ): Promise<boolean>;
  create(input: {
    teacher_id: number;
    class_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }): ClassScheduleOrmEntity;
  save(schedule: ClassScheduleOrmEntity): Promise<ClassScheduleOrmEntity>;
  remove(schedule: ClassScheduleOrmEntity): Promise<ClassScheduleOrmEntity>;
}
