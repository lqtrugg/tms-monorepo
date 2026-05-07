import type { EntityManager } from 'typeorm';

import type { BalanceSnapshotPort } from '../../../application/ports/BalanceSnapshotPort.js';
import type { StudentBalanceSnapshot } from '../../../application/dto/StudentDto.js';
import { loadBalanceSnapshotForStudent } from './EnrollmentDataAccess.js';

export class TypeOrmBalanceSnapshotPort implements BalanceSnapshotPort {
  constructor(private readonly manager: EntityManager) {}

  loadForStudent(teacherId: number, studentId: number): Promise<StudentBalanceSnapshot> {
    return loadBalanceSnapshotForStudent(this.manager, teacherId, studentId);
  }
}
