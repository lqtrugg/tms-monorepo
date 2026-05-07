import type { TransactionType } from '../../../../../entities/enums.js';
import type { Student } from '../../../../../entities/student.entity.js';
import type { TransactionAuditLogOrmEntity } from './TransactionAuditLogOrmEntity.js';
import type { TransactionOrmEntity } from './TransactionOrmEntity.js';

export interface TransactionRepository {
  findOwnedStudent(teacherId: number, studentId: number): Promise<Student | null>;
  findOwnedTransaction(teacherId: number, transactionId: number): Promise<TransactionOrmEntity | null>;
  getStudentTransactionTotals(
    teacherId: number,
    studentId: number,
    options?: { excludeTransactionId?: number },
  ): Promise<{ payments: bigint; refunds: bigint }>;
  create(input: {
    teacher_id: number;
    student_id: number;
    amount: string;
    type: TransactionType;
    notes: string | null;
    recorded_at: Date;
  }): TransactionOrmEntity;
  save(transaction: TransactionOrmEntity): Promise<TransactionOrmEntity>;
  saveWithAuditLog(
    teacherId: number,
    transactionId: number,
    transaction: TransactionOrmEntity,
    audit: Omit<TransactionAuditLogOrmEntity, 'id' | 'teacher_id' | 'transaction_id' | 'created_at'>,
  ): Promise<TransactionOrmEntity>;
}
