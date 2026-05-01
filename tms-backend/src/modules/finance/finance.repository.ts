import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Enrollment,
  FeeRecord,
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
