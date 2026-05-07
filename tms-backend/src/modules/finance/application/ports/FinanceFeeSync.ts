import type { EntityManager } from 'typeorm';

export interface FinanceFeeSync {
  syncAttendanceFeeRecord(
    manager: EntityManager,
    input: {
      teacherId: number;
      sessionId: number;
      studentId: number;
      enrollmentId: number;
      amount: string;
      shouldCharge: boolean;
      cancelledAt?: Date;
    },
  ): Promise<void>;

  cancelFeeRecordsForSessions(
    manager: EntityManager,
    teacherId: number,
    sessionIds: number[],
    cancelledAt?: Date,
  ): Promise<number>;
}
