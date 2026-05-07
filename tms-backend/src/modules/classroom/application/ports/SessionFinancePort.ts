export type SyncAttendanceFeeRecordInput = {
  teacherId: number;
  sessionId: number;
  studentId: number;
  enrollmentId: number;
  amount: string;
  shouldCharge: boolean;
};

export interface SessionFinancePort {
  cancelFeeRecordsForSessions(
    teacherId: number,
    sessionIds: number[],
    cancelledAt?: Date,
  ): Promise<void>;
  syncAttendanceFeeRecord(input: SyncAttendanceFeeRecordInput): Promise<void>;
}
