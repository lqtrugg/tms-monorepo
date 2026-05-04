import { Between, EntityManager, In, IsNull, MoreThanOrEqual } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import {
  Class,
  ClassSchedule,
  ClassStatus,
  DiscordServer,
  Enrollment,
  Session,
  SessionStatus,
  Topic,
} from '../../../entities/index.js';
import { ClassServiceError } from '../../../shared/errors/class.error.js';
import { cancelFeeRecordsForSessions } from '../../finance/index.js';
import { combineDateAndTime } from './class.helpers.js';
import type {
  ClassListFilters,
  CreateClassInput,
  CreateClassScheduleInput,
  CreateManualSessionInput,
  SessionListFilters,
  UpdateClassInput,
  UpdateClassScheduleInput,
} from './class.types.js';

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

function ensureClassActive(classEntity: Class): void {
  if (classEntity.status !== ClassStatus.Active) {
    throw new ClassServiceError('class is archived', 409);
  }
}

async function requireClassById(manager: EntityManager, classId: number): Promise<Class> {
  const classEntity = await manager.getRepository(Class).findOneBy({ id: classId });
  if (!classEntity) {
    throw new ClassServiceError('class not found', 404);
  }

  return classEntity;
}

function ensureScheduleTimeRange(schedule: ClassSchedule): void {
  if (schedule.end_time <= schedule.start_time) {
    throw new ClassServiceError('end_time must be later than start_time', 400);
  }
}

function scheduleInputsOverlap(left: CreateClassScheduleInput, right: CreateClassScheduleInput): boolean {
  return left.day_of_week === right.day_of_week
    && left.start_time < right.end_time
    && right.start_time < left.end_time;
}

function assertNoOverlappingScheduleInputs(schedules: CreateClassScheduleInput[]): void {
  for (let leftIndex = 0; leftIndex < schedules.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < schedules.length; rightIndex += 1) {
      if (scheduleInputsOverlap(schedules[leftIndex], schedules[rightIndex])) {
        throw new ClassServiceError('Lịch học không được giao nhau', 409);
      }
    }
  }
}

function dateOnlyString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function timeStringFromDate(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':');
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

async function assertNoPersistedScheduleOverlap(
  manager: EntityManager,
  teacherId: number,
  schedules: CreateClassScheduleInput[],
  options?: {
    excludeClassId?: number;
    excludeScheduleId?: number;
  },
): Promise<void> {
  for (const schedule of schedules) {
    const query = manager.getRepository(ClassSchedule)
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
  schedules: CreateClassScheduleInput[],
): Promise<void> {
  if (schedules.length === 0) {
    return;
  }

  const now = new Date();
  const startDate = nowStartOfDay();
  const endDate = addDays(startDate, SESSION_GENERATION_HORIZON_DAYS);
  const sessions = await manager.getRepository(Session).find({
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

async function assertManualSessionDoesNotOverlap(
  manager: EntityManager,
  teacherId: number,
  scheduledAt: Date,
  endTime: string,
): Promise<void> {
  const sessions = await manager.getRepository(Session).find({
    where: {
      teacher_id: teacherId,
      scheduled_at: Between(
        new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate(), 0, 0, 0, 0),
        endOfDay(scheduledAt),
      ),
    },
  });

  const overlappingSession = sessions.find((session) => (
    !session.isCancelled()
    && session.end_time !== null
    && sessionOverlaps(session.scheduled_at, session.end_time, scheduledAt, endTime)
  ));

  if (overlappingSession) {
    throw new ClassServiceError('Buổi học không được giao nhau với buổi học đã có', 409);
  }
}

async function requireScheduleForClass(
  manager: EntityManager,
  classId: number,
  scheduleId: number,
): Promise<ClassSchedule> {
  const schedule = await manager.getRepository(ClassSchedule).findOneBy({
    id: scheduleId,
    class_id: classId,
  });

  if (!schedule) {
    throw new ClassServiceError('class schedule not found', 404);
  }

  return schedule;
}

async function requireSessionById(manager: EntityManager, sessionId: number): Promise<Session> {
  const session = await manager.getRepository(Session).findOneBy({ id: sessionId });

  if (!session) {
    throw new ClassServiceError('session not found', 404);
  }

  return session;
}

async function replaceClassSchedules(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  schedules: CreateClassScheduleInput[],
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

async function reconcileGeneratedSessionsForClass(
  manager: EntityManager,
  teacherId: number,
  classId: number,
): Promise<{ sessions_created: number; sessions_removed: number }> {
  const schedules = await manager.getRepository(ClassSchedule).find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
    },
  });

  const now = new Date();
  const sessionRepo = manager.getRepository(Session);
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

export async function reconcileAllGeneratedClassSessions(): Promise<{
  classes_reconciled: number;
  sessions_created: number;
  sessions_removed: number;
}> {
  return AppDataSource.transaction(async (manager) => {
    const classes = await manager.getRepository(Class).find({
      where: {
        status: ClassStatus.Active,
      },
    });

    let sessionsCreated = 0;
    let sessionsRemoved = 0;

    for (const classEntity of classes) {
      const result = await reconcileGeneratedSessionsForClass(
        manager,
        classEntity.teacher_id,
        classEntity.id,
      );
      sessionsCreated += result.sessions_created;
      sessionsRemoved += result.sessions_removed;
    }

    return {
      classes_reconciled: classes.length,
      sessions_created: sessionsCreated,
      sessions_removed: sessionsRemoved,
    };
  });
}

async function cancelFeeRecordsBySessionIds(
  manager: EntityManager,
  teacherId: number,
  sessionIds: number[],
  cancelledAt: Date,
): Promise<void> {
  await cancelFeeRecordsForSessions(manager, teacherId, sessionIds, cancelledAt);
}

export async function listClasses(teacherId: number, filters: ClassListFilters): Promise<Class[]> {
  const where = {
    teacher_id: teacherId,
    ...(filters.status ? { status: filters.status } : {}),
  };

  return AppDataSource.getRepository(Class).find({
    where,
    order: {
      created_at: 'DESC',
    },
  });
}

export async function getClassById(teacherId: number, classId: number): Promise<Class> {
  return requireClassById(AppDataSource.manager, classId);
}

export async function createClass(teacherId: number, input: CreateClassInput): Promise<Class> {
  return AppDataSource.transaction(async (manager) => {
    const classRepo = manager.getRepository(Class);
    const classEntity = classRepo.create({
      teacher_id: teacherId,
      name: input.name,
      fee_per_session: input.fee_per_session,
      status: ClassStatus.Active,
      archived_at: null,
    });

    const savedClass = await classRepo.save(classEntity);

    if (input.schedules !== undefined) {
      await replaceClassSchedules(manager, teacherId, savedClass.id, input.schedules);
    }

    return savedClass;
  });
}

export async function updateClass(teacherId: number, classId: number, input: UpdateClassInput): Promise<Class> {
  return AppDataSource.transaction(async (manager) => {
    const classRepo = manager.getRepository(Class);
    const classEntity = await requireClassById(manager, classId);

    ensureClassActive(classEntity);

    if (input.name !== undefined) {
      classEntity.name = input.name;
    }

    if (input.fee_per_session !== undefined) {
      classEntity.fee_per_session = input.fee_per_session;
    }

    const savedClass = await classRepo.save(classEntity);

    if (input.schedules !== undefined) {
      await replaceClassSchedules(manager, teacherId, classId, input.schedules);
    }

    return savedClass;
  });
}

export async function archiveClass(teacherId: number, classId: number): Promise<Class> {
  return AppDataSource.transaction(async (manager) => {
    const classRepo = manager.getRepository(Class);
    const sessionRepo = manager.getRepository(Session);
    const classEntity = await requireClassById(manager, classId);

    if (classEntity.status === ClassStatus.Archived) {
      return classEntity;
    }

    const activeEnrollmentCount = await manager.getRepository(Enrollment).count({
      where: {
        teacher_id: teacherId,
        class_id: classId,
        unenrolled_at: IsNull(),
      },
    });

    if (activeEnrollmentCount > 0) {
      throw new ClassServiceError(
        `Không thể đóng lớp: còn ${activeEnrollmentCount} học sinh đang học trong lớp`,
        409,
      );
    }

    const activeTopicCount = await manager.getRepository(Topic).count({
      where: {
        teacher_id: teacherId,
        class_id: classId,
        closed_at: IsNull(),
      },
    });

    if (activeTopicCount > 0) {
      throw new ClassServiceError(
        `Không thể đóng lớp: còn ${activeTopicCount} chuyên đề chưa đóng`,
        409,
      );
    }

    const linkedDiscordServerCount = await manager.getRepository(DiscordServer).count({
      where: {
        teacher_id: teacherId,
        class_id: classId,
      },
    });

    if (linkedDiscordServerCount > 0) {
      throw new ClassServiceError(
        'Không thể đóng lớp: lớp vẫn đang liên kết với Discord server',
        409,
      );
    }

    const archivedAt = new Date();

    classEntity.status = ClassStatus.Archived;
    classEntity.archived_at = archivedAt;

    await classRepo.save(classEntity);

    const upcomingScheduledSessions = await sessionRepo.find({
      where: {
        teacher_id: teacherId,
        class_id: classId,
        status: SessionStatus.Scheduled,
        scheduled_at: MoreThanOrEqual(archivedAt),
      },
    });

    if (upcomingScheduledSessions.length > 0) {
      upcomingScheduledSessions.forEach((session) => {
        session.cancel(archivedAt);
      });

      await sessionRepo.save(upcomingScheduledSessions);
      await cancelFeeRecordsBySessionIds(
        manager,
        teacherId,
        upcomingScheduledSessions.map((session) => session.id),
        archivedAt,
      );
    }

    return classEntity;
  });
}

export async function listClassSchedules(teacherId: number, classId: number): Promise<ClassSchedule[]> {
  return AppDataSource.getRepository(ClassSchedule).find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
    },
    order: {
      day_of_week: 'ASC',
      start_time: 'ASC',
      end_time: 'ASC',
    },
  });
}

export async function createClassSchedule(
  teacherId: number,
  classId: number,
  input: CreateClassScheduleInput,
): Promise<{ schedule: ClassSchedule; sessions_created: number }> {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireClassById(manager, classId);
    ensureClassActive(classEntity);
    assertNoOverlappingScheduleInputs([input]);
    await assertNoPersistedScheduleOverlap(manager, teacherId, [input]);
    await assertNoUpcomingSessionOverlapForSchedules(manager, teacherId, classId, [input]);

    const scheduleRepo = manager.getRepository(ClassSchedule);
    const schedule = scheduleRepo.create({
      teacher_id: teacherId,
      class_id: classId,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
    });

    ensureScheduleTimeRange(schedule);

    const savedSchedule = await scheduleRepo.save(schedule);
    const { sessions_created: sessionsCreated } = await reconcileGeneratedSessionsForClass(
      manager,
      teacherId,
      classId,
    );

    return {
      schedule: savedSchedule,
      sessions_created: sessionsCreated,
    };
  });
}

export async function updateClassSchedule(
  teacherId: number,
  classId: number,
  scheduleId: number,
  input: UpdateClassScheduleInput,
): Promise<{ schedule: ClassSchedule; sessions_created: number }> {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireClassById(manager, classId);
    ensureClassActive(classEntity);

    const scheduleRepo = manager.getRepository(ClassSchedule);
    const schedule = await requireScheduleForClass(manager, classId, scheduleId);

    if (input.day_of_week !== undefined) {
      schedule.day_of_week = input.day_of_week;
    }

    if (input.start_time !== undefined) {
      schedule.start_time = input.start_time;
    }

    if (input.end_time !== undefined) {
      schedule.end_time = input.end_time;
    }

    ensureScheduleTimeRange(schedule);
    const nextScheduleInput = {
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    };
    assertNoOverlappingScheduleInputs([nextScheduleInput]);
    await assertNoPersistedScheduleOverlap(manager, teacherId, [nextScheduleInput], {
      excludeScheduleId: scheduleId,
    });
    await assertNoUpcomingSessionOverlapForSchedules(manager, teacherId, classId, [nextScheduleInput]);

    const savedSchedule = await scheduleRepo.save(schedule);
    const { sessions_created: sessionsCreated } = await reconcileGeneratedSessionsForClass(
      manager,
      teacherId,
      classId,
    );

    return {
      schedule: savedSchedule,
      sessions_created: sessionsCreated,
    };
  });
}

export async function deleteClassSchedule(teacherId: number, classId: number, scheduleId: number): Promise<void> {
  await AppDataSource.transaction(async (manager) => {
    const classEntity = await requireClassById(manager, classId);
    ensureClassActive(classEntity);

    const schedule = await requireScheduleForClass(manager, classId, scheduleId);
    await manager.getRepository(ClassSchedule).remove(schedule);
    await reconcileGeneratedSessionsForClass(manager, teacherId, classId);
  });
}

export async function listSessions(teacherId: number, filters: SessionListFilters): Promise<Session[]> {
  const queryBuilder = AppDataSource.getRepository(Session)
    .createQueryBuilder('session')
    .where('session.teacher_id = :teacherId', { teacherId });

  if (filters.class_id !== undefined) {
    queryBuilder.andWhere('session.class_id = :classId', { classId: filters.class_id });
  }

  if (filters.status !== undefined) {
    queryBuilder.andWhere('session.status = :status', { status: filters.status });
  }

  if (filters.from !== undefined) {
    queryBuilder.andWhere('session.scheduled_at >= :from', { from: filters.from });
  }

  if (filters.to !== undefined) {
    queryBuilder.andWhere('session.scheduled_at <= :to', { to: filters.to });
  }

  return queryBuilder.orderBy('session.scheduled_at', 'ASC').getMany();
}

export async function listClassSessions(
  teacherId: number,
  classId: number,
  filters: Omit<SessionListFilters, 'class_id'>,
): Promise<Session[]> {
  return listSessions(teacherId, {
    ...filters,
    class_id: classId,
  });
}

export async function createManualSession(
  teacherId: number,
  classId: number,
  input: CreateManualSessionInput,
): Promise<Session> {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireClassById(manager, classId);
    ensureClassActive(classEntity);

    if (input.scheduled_at.getTime() < Date.now()) {
      throw new ClassServiceError('scheduled_at must be greater than or equal to current time', 400);
    }

    const sessionRepo = manager.getRepository(Session);
    const duplicated = await sessionRepo.findOneBy({
      teacher_id: teacherId,
      class_id: classId,
      scheduled_at: input.scheduled_at,
    });

    if (duplicated) {
      throw new ClassServiceError('session at this datetime already exists', 409);
    }

    await assertManualSessionDoesNotOverlap(manager, teacherId, input.scheduled_at, input.end_time);

    const session = sessionRepo.create({
      teacher_id: teacherId,
      class_id: classId,
      scheduled_at: input.scheduled_at,
      end_time: input.end_time,
      status: SessionStatus.Scheduled,
      is_manual: true,
    });

    return sessionRepo.save(session);
  });
}

export async function cancelSession(teacherId: number, sessionId: number): Promise<Session> {
  return AppDataSource.transaction(async (manager) => {
    const sessionRepo = manager.getRepository(Session);
    const session = await requireSessionById(manager, sessionId);

    if (session.isCancelled()) {
      return session;
    }

    const cancelledAt = new Date();
    session.cancel(cancelledAt);
    const saved = await sessionRepo.save(session);

    await cancelFeeRecordsBySessionIds(manager, teacherId, [session.id], cancelledAt);

    return saved;
  });
}
