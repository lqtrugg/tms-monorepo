import type { ClassOrmEntity } from './ClassOrmEntity.js';
import type { SessionOrmEntity } from './SessionOrmEntity.js';

export interface SessionRepository {
  findById(teacherId: number, sessionId: number): Promise<SessionOrmEntity | null>;
  findClassById(teacherId: number, classId: number): Promise<ClassOrmEntity | null>;
  findByTeacherClassAndScheduledAt(
    teacherId: number,
    classId: number,
    scheduledAt: Date,
  ): Promise<SessionOrmEntity | null>;
  hasOverlappingSession(teacherId: number, scheduledAt: Date, endTime: string): Promise<boolean>;
  create(input: {
    teacher_id: number;
    class_id: number;
    scheduled_at: Date;
    end_time: string;
    status: SessionOrmEntity['status'];
    is_manual: boolean;
    cancelled_at: null;
  }): SessionOrmEntity;
  save(session: SessionOrmEntity): Promise<SessionOrmEntity>;
}
