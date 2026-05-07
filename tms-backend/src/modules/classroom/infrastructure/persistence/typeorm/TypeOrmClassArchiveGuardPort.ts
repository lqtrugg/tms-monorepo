import type { EntityManager } from 'typeorm';

import type { ClassArchiveGuardPort } from '../../../application/ports/ClassArchiveGuardPort.js';
import { assertClassArchivable } from './ClassArchiveSupport.js';

export class TypeOrmClassArchiveGuardPort implements ClassArchiveGuardPort {
  constructor(private readonly manager: EntityManager) {}

  assertArchivable(teacherId: number, classId: number): Promise<void> {
    return assertClassArchivable(this.manager, teacherId, classId);
  }
}
