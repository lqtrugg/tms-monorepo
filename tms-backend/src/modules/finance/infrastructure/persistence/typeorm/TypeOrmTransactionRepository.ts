import { type EntityManager } from 'typeorm';

import { AppDataSource } from '../../../../../data-source.js';
import { Student } from '../../../../../entities/student.entity.js';
import { parseAmountToBigInt } from '../../../../../shared/helpers/money.js';
import type { TransactionRepository } from './TransactionRepository.js';
import { TransactionAuditLogOrmEntity } from './TransactionAuditLogOrmEntity.js';
import { TransactionOrmEntity } from './TransactionOrmEntity.js';

export class TypeOrmTransactionRepository implements TransactionRepository {
  constructor(private readonly manager: EntityManager = AppDataSource.manager) {}

  findOwnedStudent(teacherId: number, studentId: number) {
    return this.manager.getRepository(Student).findOneBy({
      id: studentId,
      teacher_id: teacherId,
    });
  }

  findOwnedTransaction(teacherId: number, transactionId: number) {
    return this.manager.getRepository(TransactionOrmEntity).findOneBy({
      id: transactionId,
      teacher_id: teacherId,
    });
  }

  async getStudentTransactionTotals(
    teacherId: number,
    studentId: number,
    options?: { excludeTransactionId?: number },
  ): Promise<{ payments: bigint; refunds: bigint }> {
    const queryBuilder = this.manager.getRepository(TransactionOrmEntity)
      .createQueryBuilder('transaction')
      .select("COALESCE(SUM(CASE WHEN transaction.type = 'payment' THEN transaction.amount ELSE 0 END), 0)", 'payments')
      .addSelect("COALESCE(SUM(CASE WHEN transaction.type = 'refund' THEN ABS(transaction.amount) ELSE 0 END), 0)", 'refunds')
      .where('transaction.teacher_id = :teacherId', { teacherId })
      .andWhere('transaction.student_id = :studentId', { studentId });

    if (options?.excludeTransactionId !== undefined) {
      queryBuilder.andWhere('transaction.id != :transactionId', {
        transactionId: options.excludeTransactionId,
      });
    }

    const totals = await queryBuilder.getRawOne<{ payments: string; refunds: string }>();

    return {
      payments: parseAmountToBigInt(totals?.payments),
      refunds: parseAmountToBigInt(totals?.refunds),
    };
  }

  create(input: {
    teacher_id: number;
    student_id: number;
    amount: string;
    type: import('../../../../../entities/enums.js').TransactionType;
    notes: string | null;
    recorded_at: Date;
  }) {
    return this.manager.getRepository(TransactionOrmEntity).create(input);
  }

  save(transaction: TransactionOrmEntity) {
    return this.manager.getRepository(TransactionOrmEntity).save(transaction);
  }

  async saveWithAuditLog(
    teacherId: number,
    transactionId: number,
    transaction: TransactionOrmEntity,
    audit: Omit<TransactionAuditLogOrmEntity, 'id' | 'teacher_id' | 'transaction_id' | 'created_at'>,
  ) {
    return this.manager.transaction(async (manager) => {
      const saved = await manager.getRepository(TransactionOrmEntity).save(transaction);
      const auditLog = manager.getRepository(TransactionAuditLogOrmEntity).create({
        teacher_id: teacherId,
        transaction_id: transactionId,
        ...audit,
      });

      await manager.getRepository(TransactionAuditLogOrmEntity).save(auditLog);
      return saved;
    });
  }
}
