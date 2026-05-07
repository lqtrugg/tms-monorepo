export type TransferStudentCommand = {
  teacherId: number;
  studentId: number;
  toClassId: number;
  transferredAt: Date;
};
