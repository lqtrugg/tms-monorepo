export type BulkTransferStudentsCommand = {
  teacherId: number;
  studentIds: number[];
  toClassId: number;
  transferredAt: Date;
};
