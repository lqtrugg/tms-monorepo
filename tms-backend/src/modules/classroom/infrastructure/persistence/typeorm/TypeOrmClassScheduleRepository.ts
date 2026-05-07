import { Between, type EntityManager } from 'typeorm';

import { ClassStatus, SessionStatus } from '../../../../../entities/enums.js';
import type { ClassScheduleRepository } from './ClassScheduleRepository.js';
import { ClassScheduleOrmEntity } from './ClassScheduleOrmEntity.js';
import { ClassOrmEntity } from './ClassOrmEntity.js';
import { combineDateAndTime } from './ClassroomDateTime.js';
import { SessionOrmEntity } from './SessionOrmEntity.js';

const SESSION_GENERATION_HORIZON_DAYS = 180;

function nowStartOfDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateOnlyString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function combineDateWithEndTime(date: Date, endTime: string): Date {
  return combineDateAndTime(dateOnlyString(date), endTime);
}

function sessionOverlaps(
  sessionStart: Date,
  sessionEndTime: string,
  candidateStart: Date,
  candidateEndTime: string,
): boolean {
  const sessionEnd = combineDateWithEndTime(sessionStart, sessionEndTime);
  const candidateEnd = combineDateWithEndTime(candidateStart, candidateEndTime);
  return sessionStart < candidateEnd && candidateStart < sessionEnd;
}

export class TypeOrmClassScheduleRepository implements ClassScheduleRepository {
  constructor(private readonly manager: EntityManager) {}

  findClassById(teacherId: number, classId: number): Promise<ClassOrmEntity | null> {
    return this.manager.getRepository(ClassOrmEntity).findOneBy({
      id: classId,
      teacher_id: teacherId,
    });
  }

  findByIdForClass(
    teacherId: number,
    classId: number,
    scheduleId: number,
  ): Promise<ClassScheduleOrmEntity | null> {
    return this.manager.getRepository(ClassScheduleOrmEntity).findOneBy({
      id: scheduleId,
      teacher_id: teacherId,
      class_id: classId,
    });
  }

  async hasOverlappingPersistedSchedule(
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
  ): Promise<boolean> {
    const query = this.manager.getRepository(ClassScheduleOrmEntity)
      .createQueryBuilder('schedule')
      .innerJoin(ClassOrmEntity, 'class', 'class.id = schedule.class_id')
      .where('schedule.teacher_id = :teacherId', { teacherId })
      .andWhere('schedule.day_of_week = :dayOfWeek', { dayOfWeek: schedule.day_of_week })
      .andWhere('class.status = :activeStatus', { activeStatus: ClassStatus.Active })
      .andWhere('schedule.start_time < :endTime', { endTime: schedule.end_time })
      .andWhere(':startTime < schedule.end_time', { startTime: schedule.start_time });

    if (options?.excludeClassId !== undefined) {
      query.andWhere('schedule.class_id <> :excludeClassId', { excludeClassId: options.excludeClassId });
    }

    if (options?.excludeScheduleId !== undefined) {
      query.andWhere('schedule.id <> :excludeScheduleId', { excludeScheduleId: options.excludeScheduleId });
    }

    return (await query.getOne()) !== null;
  }

  async hasOverlappingUpcomingSessions(
    teacherId: number,
    classId: number,
    schedules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
    }>,
  ): Promise<boolean> {
    if (schedules.length === 0) {
      return false;
    }

    const now = new Date();
    const startDate = nowStartOfDay();
    const endDate = addDays(startDate, SESSION_GENERATION_HORIZON_DAYS);
    const sessions = await this.manager.getRepository(SessionOrmEntity).find({
      where: {
        teacher_id: teacherId,
        scheduled_at: Between(now, endOfDay(endDate)),
      },
    });

    const sessionsToCompare = sessions.filter((session) => (
      !session.isCancelled()
      && session.end_time !== null
      && (session.class_id !== classId || session.is_manual)
    ));

    for (const schedule of schedules) {
      for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
        if (cursor.getDay() !== schedule.day_of_week) {
          continue;
        }

        const scheduledAt = combineDateAndTime(dateOnlyString(cursor), schedule.start_time);

        if (scheduledAt < now) {
          continue;
        }

        const overlapping = sessionsToCompare.some((session) => (
          session.end_time !== null
          && sessionOverlaps(session.scheduled_at, session.end_time, scheduledAt, schedule.end_time)
        ));

        if (overlapping) {
          return true;
        }
      }
    }

    return false;
  }

  create(input: {
    teacher_id: number;
    class_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }): ClassScheduleOrmEntity {
    return this.manager.getRepository(ClassScheduleOrmEntity).create(input);
  }

  save(schedule: ClassScheduleOrmEntity): Promise<ClassScheduleOrmEntity> {
    return this.manager.getRepository(ClassScheduleOrmEntity).save(schedule);
  }

  remove(schedule: ClassScheduleOrmEntity): Promise<ClassScheduleOrmEntity> {
    return this.manager.getRepository(ClassScheduleOrmEntity).remove(schedule);
  }
}
