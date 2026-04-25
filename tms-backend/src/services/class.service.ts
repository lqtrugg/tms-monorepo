import { Between, EntityManager, In, MoreThanOrEqual } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import {
  Class,
  ClassSchedule,
  ClassStatus,
  CodeforcesGroup,
  FeeRecord,
  FeeRecordStatus,
  Session,
  SessionStatus,
} from '../entities/index.js';
import { ClassServiceError } from '../errors/class.error.js';
import { combineDateAndTime } from '../helpers/class.helpers.js';
import type {
  ClassListFilters,
  CreateClassInput,
  CreateClassScheduleInput,
  CreateManualSessionInput,
  SessionListFilters,
  UpdateClassInput,
  UpdateClassScheduleInput,
  UpsertCodeforcesGroupInput,
} from '../types/class.types.js';

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

function ensureScheduleTimeRange(schedule: ClassSchedule): void {
  if (schedule.end_time <= schedule.start_time) {
    throw new ClassServiceError('end_time must be later than start_time', 400);
  }
}

async function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  const classEntity = await manager.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });

  if (!classEntity) {
    throw new ClassServiceError('class not found', 404);
  }

  return classEntity;
}

async function requireOwnedSchedule(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  scheduleId: number,
): Promise<ClassSchedule> {
  const schedule = await manager.getRepository(ClassSchedule).findOneBy({
    id: scheduleId,
    teacher_id: teacherId,
    class_id: classId,
  });

  if (!schedule) {
    throw new ClassServiceError('class schedule not found', 404);
  }

  return schedule;
}

async function requireOwnedSession(manager: EntityManager, teacherId: number, sessionId: number): Promise<Session> {
  const session = await manager.getRepository(Session).findOneBy({
    id: sessionId,
    teacher_id: teacherId,
  });

  if (!session) {
    throw new ClassServiceError('session not found', 404);
  }

  return session;
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

async function cancelFeeRecordsBySessionIds(
  manager: EntityManager,
  teacherId: number,
  sessionIds: number[],
  cancelledAt: Date,
): Promise<void> {
  if (sessionIds.length === 0) {
    return;
  }

  const feeRecordRepo = manager.getRepository(FeeRecord);
  const feeRecords = await feeRecordRepo.find({
    where: {
      teacher_id: teacherId,
      session_id: In(sessionIds),
      status: FeeRecordStatus.Active,
    },
  });

  if (feeRecords.length === 0) {
    return;
  }

  feeRecords.forEach((item) => {
    item.status = FeeRecordStatus.Cancelled;
    item.cancelled_at = cancelledAt;
  });

  await feeRecordRepo.save(feeRecords);
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
  return requireOwnedClass(AppDataSource.manager, teacherId, classId);
}

export async function createClass(teacherId: number, input: CreateClassInput): Promise<Class> {
  const classRepo = AppDataSource.getRepository(Class);

  const classEntity = classRepo.create({
    teacher_id: teacherId,
    name: input.name,
    fee_per_session: input.fee_per_session,
    status: ClassStatus.Active,
    archived_at: null,
  });

  return classRepo.save(classEntity);
}

export async function updateClass(teacherId: number, classId: number, input: UpdateClassInput): Promise<Class> {
  const classRepo = AppDataSource.getRepository(Class);
  const classEntity = await requireOwnedClass(AppDataSource.manager, teacherId, classId);

  ensureClassActive(classEntity);

  if (input.name !== undefined) {
    classEntity.name = input.name;
  }

  if (input.fee_per_session !== undefined) {
    classEntity.fee_per_session = input.fee_per_session;
  }

  return classRepo.save(classEntity);
}

export async function archiveClass(teacherId: number, classId: number): Promise<Class> {
  return AppDataSource.transaction(async (manager) => {
    const classRepo = manager.getRepository(Class);
    const sessionRepo = manager.getRepository(Session);
    const classEntity = await requireOwnedClass(manager, teacherId, classId);

    if (classEntity.status === ClassStatus.Archived) {
      return classEntity;
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
        session.status = SessionStatus.Cancelled;
        session.cancelled_at = archivedAt;
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
  await requireOwnedClass(AppDataSource.manager, teacherId, classId);

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
    const classEntity = await requireOwnedClass(manager, teacherId, classId);
    ensureClassActive(classEntity);

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
    const sessionsCreated = await generateSessionsForSchedule(manager, teacherId, savedSchedule);

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
    const classEntity = await requireOwnedClass(manager, teacherId, classId);
    ensureClassActive(classEntity);

    const scheduleRepo = manager.getRepository(ClassSchedule);
    const schedule = await requireOwnedSchedule(manager, teacherId, classId, scheduleId);

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

    const savedSchedule = await scheduleRepo.save(schedule);
    const sessionsCreated = await generateSessionsForSchedule(manager, teacherId, savedSchedule);

    return {
      schedule: savedSchedule,
      sessions_created: sessionsCreated,
    };
  });
}

export async function deleteClassSchedule(teacherId: number, classId: number, scheduleId: number): Promise<void> {
  await AppDataSource.transaction(async (manager) => {
    const classEntity = await requireOwnedClass(manager, teacherId, classId);
    ensureClassActive(classEntity);

    const schedule = await requireOwnedSchedule(manager, teacherId, classId, scheduleId);
    await manager.getRepository(ClassSchedule).remove(schedule);
  });
}

export async function listSessions(teacherId: number, filters: SessionListFilters): Promise<Session[]> {
  if (filters.class_id !== undefined) {
    await requireOwnedClass(AppDataSource.manager, teacherId, filters.class_id);
  }

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
  await requireOwnedClass(AppDataSource.manager, teacherId, classId);

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
    const classEntity = await requireOwnedClass(manager, teacherId, classId);
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

    const session = sessionRepo.create({
      teacher_id: teacherId,
      class_id: classId,
      scheduled_at: input.scheduled_at,
      status: SessionStatus.Scheduled,
      is_manual: true,
    });

    return sessionRepo.save(session);
  });
}

export async function cancelSession(teacherId: number, sessionId: number): Promise<Session> {
  return AppDataSource.transaction(async (manager) => {
    const sessionRepo = manager.getRepository(Session);
    const session = await requireOwnedSession(manager, teacherId, sessionId);

    if (session.status === SessionStatus.Cancelled) {
      return session;
    }

    const cancelledAt = new Date();
    session.status = SessionStatus.Cancelled;
    session.cancelled_at = cancelledAt;
    const saved = await sessionRepo.save(session);

    await cancelFeeRecordsBySessionIds(manager, teacherId, [session.id], cancelledAt);

    return saved;
  });
}

export async function getCodeforcesGroup(teacherId: number, classId: number): Promise<CodeforcesGroup | null> {
  await requireOwnedClass(AppDataSource.manager, teacherId, classId);

  return AppDataSource.getRepository(CodeforcesGroup).findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });
}

export async function upsertCodeforcesGroup(
  teacherId: number,
  classId: number,
  input: UpsertCodeforcesGroupInput,
): Promise<CodeforcesGroup> {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireOwnedClass(manager, teacherId, classId);
    ensureClassActive(classEntity);

    const groupRepo = manager.getRepository(CodeforcesGroup);
    const existing = await groupRepo.findOneBy({
      teacher_id: teacherId,
      class_id: classId,
    });

    if (existing) {
      existing.group_url = input.group_url;
      existing.group_name = input.group_name;
      return groupRepo.save(existing);
    }

    const group = groupRepo.create({
      teacher_id: teacherId,
      class_id: classId,
      group_url: input.group_url,
      group_name: input.group_name,
    });

    return groupRepo.save(group);
  });
}

export async function removeCodeforcesGroup(teacherId: number, classId: number): Promise<boolean> {
  await requireOwnedClass(AppDataSource.manager, teacherId, classId);

  const groupRepo = AppDataSource.getRepository(CodeforcesGroup);
  const existing = await groupRepo.findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });

  if (!existing) {
    return false;
  }

  await groupRepo.remove(existing);
  return true;
}
