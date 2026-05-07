import { Between, MoreThanOrEqual, type EntityManager } from 'typeorm';

import {
  Class,
  ClassSchedule,
  ClassStatus,
  Session,
  SessionStatus,
} from '../../../../../entities/index.js';
import { ClassServiceError } from '../../../../../shared/errors/class.error.js';
import type { ClassScheduleInput } from '../../../application/dto/ClassDto.js';
import { combineDateAndTime } from './ClassroomDateTime.js';

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

function ensureScheduleTimeRange(schedule: ClassSchedule): void {
  if (schedule.end_time <= schedule.start_time) {
    throw new ClassServiceError('end_time must be later than start_time', 400);
  }
}

function scheduleInputsOverlap(left: ClassScheduleInput, right: ClassScheduleInput): boolean {
  return left.day_of_week === right.day_of_week
    && left.start_time < right.end_time
    && right.start_time < left.end_time;
}

function assertNoOverlappingScheduleInputs(schedules: ClassScheduleInput[]): void {
  for (let leftIndex = 0; leftIndex < schedules.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < schedules.length; rightIndex += 1) {
      if (scheduleInputsOverlap(schedules[leftIndex], schedules[rightIndex])) {
        throw new ClassServiceError('Lịch học không được giao nhau', 409);
      }
    }
  }
}

async function assertNoPersistedScheduleOverlap(
  manager: EntityManager,
  teacherId: number,
  schedules: ClassScheduleInput[],
  options?: {
    excludeClassId?: number;
    excludeScheduleId?: number;
  },
): Promise<void> {
  const scheduleRepo = manager.getRepository(ClassSchedule);

  for (const schedule of schedules) {
    const query = scheduleRepo
      .createQueryBuilder('schedule')
      .innerJoin(Class, 'class', 'class.id = schedule.class_id')
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

    const overlappingSchedule = await query.getOne();

    if (overlappingSchedule) {
      throw new ClassServiceError('Lịch học không được giao nhau', 409);
    }
  }
}

async function assertNoUpcomingSessionOverlapForSchedules(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  schedules: ClassScheduleInput[],
): Promise<void> {
  if (schedules.length === 0) {
    return;
  }

  const now = new Date();
  const startDate = nowStartOfDay();
  const endDate = addDays(startDate, SESSION_GENERATION_HORIZON_DAYS);
  const sessionRepo = manager.getRepository(Session);
  const sessions = await sessionRepo.find({
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

      const overlappingSession = sessionsToCompare.find((session) => (
        session.end_time !== null
        && sessionOverlaps(session.scheduled_at, session.end_time, scheduledAt, schedule.end_time)
      ));

      if (overlappingSession) {
        throw new ClassServiceError('Lịch học bị trùng với buổi học đã có', 409);
      }
    }
  }
}

async function generateSessionsForSchedule(
  manager: EntityManager,
  teacherId: number,
  schedule: ClassSchedule,
): Promise<number> {
  const now = new Date();
  const startDate = nowStartOfDay();
  const endDate = addDays(startDate, SESSION_GENERATION_HORIZON_DAYS);

  if (endDate < startDate) {
    return 0;
  }

  const rangeStart = startDate;
  const rangeEnd = endOfDay(endDate);

  const sessionRepo = manager.getRepository(Session);
  const existingSessions = await sessionRepo.find({
    where: {
      teacher_id: teacherId,
      class_id: schedule.class_id,
      scheduled_at: Between(rangeStart, rangeEnd),
    },
  });

  const existingTimestamps = new Set(existingSessions.map((item) => item.scheduled_at.getTime()));
  const sessionsToCreate: Session[] = [];

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== schedule.day_of_week) {
      continue;
    }

    const dateOnly = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const scheduledAt = combineDateAndTime(dateOnly, schedule.start_time);
    const scheduledAtTimestamp = scheduledAt.getTime();

    if (scheduledAt < now) {
      continue;
    }

    if (existingTimestamps.has(scheduledAtTimestamp)) {
      continue;
    }

    sessionsToCreate.push(
      sessionRepo.create({
        teacher_id: teacherId,
        class_id: schedule.class_id,
        scheduled_at: scheduledAt,
        end_time: schedule.end_time,
        status: SessionStatus.Scheduled,
        is_manual: false,
      }),
    );

    existingTimestamps.add(scheduledAtTimestamp);
  }

  if (sessionsToCreate.length > 0) {
    await sessionRepo.save(sessionsToCreate);
  }

  return sessionsToCreate.length;
}

function sessionMatchesSchedule(session: Session, schedule: ClassSchedule): boolean {
  const scheduledTime = [
    String(session.scheduled_at.getHours()).padStart(2, '0'),
    String(session.scheduled_at.getMinutes()).padStart(2, '0'),
    String(session.scheduled_at.getSeconds()).padStart(2, '0'),
  ].join(':');

  return session.scheduled_at.getDay() === schedule.day_of_week
    && scheduledTime === schedule.start_time;
}

export async function reconcileGeneratedSessionsForClass(
  manager: EntityManager,
  teacherId: number,
  classId: number,
): Promise<{ sessions_created: number; sessions_removed: number }> {
  const scheduleRepo = manager.getRepository(ClassSchedule);
  const sessionRepo = manager.getRepository(Session);
  const schedules = await scheduleRepo.find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
    },
  });

  const now = new Date();
  const upcomingGeneratedSessions = await sessionRepo.find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
      status: SessionStatus.Scheduled,
      is_manual: false,
      scheduled_at: MoreThanOrEqual(now),
    },
  });

  const obsoleteSessions = upcomingGeneratedSessions.filter((session) => (
    !schedules.some((schedule) => sessionMatchesSchedule(session, schedule))
  ));
  const scheduleBySessionId = new Map<number, ClassSchedule>();
  upcomingGeneratedSessions.forEach((session) => {
    const schedule = schedules.find((item) => sessionMatchesSchedule(session, item));
    if (schedule) {
      scheduleBySessionId.set(session.id, schedule);
    }
  });
  const sessionsNeedingEndTimeUpdate = upcomingGeneratedSessions.filter((session) => {
    const schedule = scheduleBySessionId.get(session.id);
    return schedule && session.end_time !== schedule.end_time;
  });

  if (obsoleteSessions.length > 0) {
    await sessionRepo.remove(obsoleteSessions);
  }

  if (sessionsNeedingEndTimeUpdate.length > 0) {
    sessionsNeedingEndTimeUpdate.forEach((session) => {
      const schedule = scheduleBySessionId.get(session.id);
      session.end_time = schedule?.end_time ?? session.end_time;
    });
    await sessionRepo.save(sessionsNeedingEndTimeUpdate);
  }

  let sessionsCreated = 0;
  for (const schedule of schedules) {
    sessionsCreated += await generateSessionsForSchedule(manager, teacherId, schedule);
  }

  return {
    sessions_created: sessionsCreated,
    sessions_removed: obsoleteSessions.length,
  };
}

export async function replaceClassSchedules(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  schedules: ClassScheduleInput[],
): Promise<void> {
  assertNoOverlappingScheduleInputs(schedules);
  await assertNoPersistedScheduleOverlap(manager, teacherId, schedules, { excludeClassId: classId });
  await assertNoUpcomingSessionOverlapForSchedules(manager, teacherId, classId, schedules);

  const scheduleRepo = manager.getRepository(ClassSchedule);
  const existingSchedules = await scheduleRepo.find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
    },
  });

  if (existingSchedules.length > 0) {
    await scheduleRepo.remove(existingSchedules);
  }

  if (schedules.length > 0) {
    const schedulesToSave = schedules.map((input) => {
      const schedule = scheduleRepo.create({
        teacher_id: teacherId,
        class_id: classId,
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
      });

      ensureScheduleTimeRange(schedule);
      return schedule;
    });

    await scheduleRepo.save(schedulesToSave);
  }

  await reconcileGeneratedSessionsForClass(manager, teacherId, classId);
}
