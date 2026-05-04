import { EntityManager } from 'typeorm';

import {
  ClassSchedule,
  DiscordServer,
  Enrollment,
  Session,
  Topic,
} from '../../../entities/index.js';

export function classScheduleRepository(manager: EntityManager) {
  return manager.getRepository(ClassSchedule);
}

export function sessionRepository(manager: EntityManager) {
  return manager.getRepository(Session);
}

export function enrollmentRepository(manager: EntityManager) {
  return manager.getRepository(Enrollment);
}

export function topicRepository(manager: EntityManager) {
  return manager.getRepository(Topic);
}

export function discordServerRepository(manager: EntityManager) {
  return manager.getRepository(DiscordServer);
}

export function findOwnedSchedule(
  manager: EntityManager,
  teacherId: number,
  scheduleId: number,
): Promise<ClassSchedule | null> {
  return classScheduleRepository(manager).findOneBy({
    id: scheduleId,
    teacher_id: teacherId,
  });
}

export function findOwnedSession(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
): Promise<Session | null> {
  return sessionRepository(manager).findOneBy({
    id: sessionId,
    teacher_id: teacherId,
  });
}
