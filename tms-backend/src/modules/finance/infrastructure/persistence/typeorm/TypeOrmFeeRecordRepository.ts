import { type EntityManager } from 'typeorm';

import { AppDataSource } from '../../../../../data-source.js';
import type { FeeRecordRepository } from './FeeRecordRepository.js';
import { FeeRecordOrmEntity } from './FeeRecordOrmEntity.js';

export class TypeOrmFeeRecordRepository implements FeeRecordRepository {
  constructor(private readonly manager: EntityManager = AppDataSource.manager) {}

  findOwnedFeeRecord(teacherId: number, feeRecordId: number) {
    return this.manager.getRepository(FeeRecordOrmEntity).findOneBy({
      id: feeRecordId,
      teacher_id: teacherId,
    });
  }

  save(feeRecord: FeeRecordOrmEntity) {
    return this.manager.getRepository(FeeRecordOrmEntity).save(feeRecord);
  }
}
