export type BulkWithdrawStudentsCommand = {
  teacherId: number;
  studentIds: number[];
  withdrawnAt: Date;
};
