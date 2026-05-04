import { EntityManager, In } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Enrollment,
  FeeRecord,
  FeeRecordStatus,
  Student,
  Transaction,
  TransactionAuditLog,
} from '../../entities/index.js';

export function transactionRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Transaction);
}

export function transactionAuditLogRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(TransactionAuditLog);
}

export function feeRecordRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(FeeRecord);
}

export function studentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Student);
}

export function enrollmentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Enrollment);
}

export function findOwnedStudent(teacherId: number, studentId: number): Promise<Student | null> {
  return studentRepository().findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
}

export function findOwnedTransaction(teacherId: number, transactionId: number): Promise<Transaction | null> {
  return transactionRepository().findOneBy({
    id: transactionId,
    teacher_id: teacherId,
  });
}

export function findOwnedFeeRecord(teacherId: number, feeRecordId: number): Promise<FeeRecord | null> {
  return feeRecordRepository().findOneBy({
    id: feeRecordId,
    teacher_id: teacherId,
  });
}

export function findFeeRecordForAttendance(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
  studentId: number,
): Promise<FeeRecord | null> {
  return feeRecordRepository(manager).findOneBy({
    teacher_id: teacherId,
    session_id: sessionId,
    student_id: studentId,
  });
}

export function createFeeRecord(
  manager: EntityManager,
  input: {
    teacher_id: number;
    student_id: number;
    session_id: number;
    enrollment_id: number;
    amount: string;
  },
): FeeRecord {
  const feeRecord = feeRecordRepository(manager).create({
    teacher_id: input.teacher_id,
    student_id: input.student_id,
    session_id: input.session_id,
  });
  feeRecord.activate({
    enrollment_id: input.enrollment_id,
    amount: input.amount,
  });

  return feeRecord;
}

export function saveFeeRecord(manager: EntityManager, feeRecord: FeeRecord): Promise<FeeRecord> {
  return feeRecordRepository(manager).save(feeRecord);
}

export function findActiveFeeRecordsBySessionIds(
  manager: EntityManager,
  teacherId: number,
  sessionIds: number[],
): Promise<FeeRecord[]> {
  if (sessionIds.length === 0) {
    return Promise.resolve([]);
  }

  return feeRecordRepository(manager).find({
    where: {
      teacher_id: teacherId,
      session_id: In(sessionIds),
      status: FeeRecordStatus.Active,
    },
  });
}

export function saveFeeRecords(manager: EntityManager, feeRecords: FeeRecord[]): Promise<FeeRecord[]> {
  return feeRecordRepository(manager).save(feeRecords);
}
