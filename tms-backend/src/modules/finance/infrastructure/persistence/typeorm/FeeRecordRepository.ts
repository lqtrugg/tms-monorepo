import type { FeeRecordOrmEntity } from './FeeRecordOrmEntity.js';

export interface FeeRecordRepository {
  findOwnedFeeRecord(teacherId: number, feeRecordId: number): Promise<FeeRecordOrmEntity | null>;
  save(feeRecord: FeeRecordOrmEntity): Promise<FeeRecordOrmEntity>;
}
