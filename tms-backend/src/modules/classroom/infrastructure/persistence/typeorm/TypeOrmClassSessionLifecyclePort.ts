import type { EntityManager } from 'typeorm';

import type { ClassSessionLifecyclePort } from '../../../application/ports/ClassSessionLifecyclePort.js';
import { cancelUpcomingScheduledSessionsForClass } from './ClassArchiveSupport.js';

export class TypeOrmClassSessionLifecyclePort implements ClassSessionLifecyclePort {
  constructor(private readonly manager: EntityManager) {}

  cancelUpcomingScheduledSessions(teacherId: number, classId: number, archivedAt: Date): Promise<void> {
    return cancelUpcomingScheduledSessionsForClass(this.manager, teacherId, classId, archivedAt);
  }
}
