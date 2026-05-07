import type { EntityManager } from 'typeorm';

import type { ClassScheduleSessionGenerationPort } from '../../../application/ports/ClassScheduleSessionGenerationPort.js';
import { reconcileGeneratedSessionsForClass } from './ClassScheduleSupport.js';

export class TypeOrmClassScheduleSessionGenerationPort implements ClassScheduleSessionGenerationPort {
  constructor(private readonly manager: EntityManager) {}

  reconcileGeneratedSessionsForClass(
    teacherId: number,
    classId: number,
  ): Promise<{ sessions_created: number; sessions_removed: number }> {
    return reconcileGeneratedSessionsForClass(this.manager, teacherId, classId);
  }
}
