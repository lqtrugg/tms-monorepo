import { Between, type EntityManager } from 'typeorm';

import { ClassOrmEntity } from './ClassOrmEntity.js';
import type { SessionRepository } from './SessionRepository.js';
import { SessionOrmEntity } from './SessionOrmEntity.js';

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function combineDateWithEndTime(date: Date, endTime: string): Date {
  const [hours, minutes, seconds] = endTime.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds, 0);
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

export class TypeOrmSessionRepository implements SessionRepository {
  constructor(private readonly manager: EntityManager) {}

  findById(teacherId: number, sessionId: number): Promise<SessionOrmEntity | null> {
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

  findByTeacherClassAndScheduledAt(
    teacherId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<SessionOrmEntity | null> {
    return this.manager.getRepository(SessionOrmEntity).findOneBy({
      teacher_id: teacherId,
      class_id: classId,
      scheduled_at: scheduledAt,
    });
  }

  async hasOverlappingSession(
    teacherId: number,
    scheduledAt: Date,
    endTime: string,
  ): Promise<boolean> {
    const sessions = await this.manager.getRepository(SessionOrmEntity).find({
      where: {
        teacher_id: teacherId,
        scheduled_at: Between(
          new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate(), 0, 0, 0, 0),
          endOfDay(scheduledAt),
        ),
      },
    });

    return sessions.some((session) => (
      !session.isCancelled()
      && session.end_time !== null
      && sessionOverlaps(session.scheduled_at, session.end_time, scheduledAt, endTime)
    ));
  }

  create(input: {
    teacher_id: number;
    class_id: number;
    scheduled_at: Date;
    end_time: string;
    status: SessionOrmEntity['status'];
    is_manual: boolean;
    cancelled_at: null;
  }): SessionOrmEntity {
    return this.manager.getRepository(SessionOrmEntity).create(input);
  }

  save(session: SessionOrmEntity): Promise<SessionOrmEntity> {
    return this.manager.getRepository(SessionOrmEntity).save(session);
  }
}
