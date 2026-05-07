import type { EntityManager } from 'typeorm';

import { TypeOrmFinanceFeeSync, type FinanceFeeSync } from '../../../../finance/index.js';
import type {
  SessionFinancePort,
  SyncAttendanceFeeRecordInput,
} from '../../../application/ports/SessionFinancePort.js';

const financeFeeSync: FinanceFeeSync = new TypeOrmFinanceFeeSync();

export class TypeOrmSessionFinancePort implements SessionFinancePort {
  constructor(private readonly manager: EntityManager) {}

  cancelFeeRecordsForSessions(
    teacherId: number,
    sessionIds: number[],
    cancelledAt?: Date,
  ): Promise<void> {
    return financeFeeSync.cancelFeeRecordsForSessions(this.manager, teacherId, sessionIds, cancelledAt).then(() => {});
  }

  syncAttendanceFeeRecord(input: SyncAttendanceFeeRecordInput): Promise<void> {
    return financeFeeSync.syncAttendanceFeeRecord(this.manager, input);
  }
}
